
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SoulState, Message, Thought, EngramNode } from '../types';

// --- CONFIGURAÇÃO ESTÁTICA DO PROJETO ---
const HARDCODED_CONFIG = {
  url: "https://vpofznuopfpudugdphqg.supabase.co", 
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwb2Z6bnVvcGZwdWR1Z2RwaHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MzUzNTMsImV4cCI6MjA4MjAxMTM1M30.72U8Ko_trV9U8CyZpOOF9_1Qw9-QAB-u2Y0vunQygNQ"
};

const CONFIG_KEY = 'aura_supabase_config';

const getInitialConfig = () => {
  const saved = localStorage.getItem(CONFIG_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    return parsed;
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || HARDCODED_CONFIG.url,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || HARDCODED_CONFIG.key
  };
};

let config = getInitialConfig();
export let supabase: SupabaseClient | null = (config.url && config.url !== "SUA_URL_DO_SUPABASE_AQUI") 
  ? createClient(config.url, config.key)
  : null;

export const updateSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, key }));
  config = { url, key };
  supabase = (url && key) ? createClient(url, key) : null;
  return !!supabase;
};

export const getSupabaseConfig = () => config;

export interface CharacterDB {
  id: string;
  name: string;
  is_awake: boolean;
  proactive_call_enabled: boolean;
}

// --- HELPER PRIVADO PARA RESOLVER ID DE SESSÃO ---
async function _resolveWakePeriodId(characterId: string, context: 'interaction' | 'dream' = 'interaction'): Promise<string | null> {
    if (!supabase) return null;

    if (context === 'dream') {
         const { data: last } = await supabase
            .from('wake_periods')
            .select('id')
            .eq('character_id', characterId)
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        return last?.id || null;
    }

    const { data: active } = await supabase
        .from('wake_periods')
        .select('id')
        .eq('character_id', characterId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (active) return active.id;

    const { data: last } = await supabase
        .from('wake_periods')
        .select('id')
        .eq('character_id', characterId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    return last?.id || null;
}

export async function searchAuraBrain(embedding: number[], characterId: string): Promise<string[]> {
  if (!supabase || !characterId) return [];
  try {
    const { data, error } = await supabase.rpc('search_aura_brain', {
      query_embedding: embedding,
      match_threshold: 0.65,
      match_count: 6,
      character_uuid: characterId
    });

    if (error) throw error;
    
    return (data as any[]).map(m => {
       const typeLabel = m.source_type === 'dream' ? '[SONHO ANTIGO]' : 
                         m.source_type === 'thought' ? '[PENSAMENTO]' : 
                         m.source_type === 'interaction' ? '[CONVERSA]' : '[FATO]';
       return `${typeLabel}: ${m.content}`;
    });
  } catch (err) {
    console.error('Master RAG Error:', err);
    return [];
  }
}

export async function getEngramNodes(characterId: string): Promise<EngramNode[]> {
    if (!supabase || !characterId) return [];
    try {
        const { data, error } = await supabase.rpc('get_engram_nodes', {
            character_uuid: characterId,
            limit_count: 100
        });
        
        if (error) throw error;
        
        const parsedData = (data || []).map((node: any) => ({
            ...node,
            embedding: typeof node.embedding === 'string' ? JSON.parse(node.embedding) : node.embedding
        }));

        return parsedData as EngramNode[];
    } catch (err) {
        console.error("Engram Fetch Error:", err);
        return [];
    }
}

export async function getRelevantMemories(embedding: number[], characterId: string): Promise<string[]> {
    return searchAuraBrain(embedding, characterId);
}

export async function saveAdvancedMemory(
  characterId: string, 
  content: string, 
  embedding: number[], 
  type: 'recent' | 'core' | 'consolidated',
  importance: number
) {
  if (!supabase || !characterId) return;
  try {
    const { error } = await supabase.from('memories').insert({
      character_id: characterId,
      content,
      embedding,
      memory_type: type,
      importance_score: importance
    });
    if (error) throw error;
  } catch (err) {
    console.error('Save Advanced Memory Error:', err);
  }
}

export async function saveDream(content: string, characterId: string, embedding?: number[]) {
  if (!supabase || !characterId) return;
  try {
    const wakePeriodId = await _resolveWakePeriodId(characterId, 'dream');

    const payload: any = {
      character_id: characterId,
      wake_period_id: wakePeriodId,
      content
    };
    if (embedding) payload.embedding = embedding;

    const { error } = await supabase.from('dreams').insert(payload);
    if (error) throw error;
  } catch (err) {
    throw err; 
  }
}

export const characterService = {
  async getOrCreateCharacter(ownerIdentifier: string = 'adm'): Promise<CharacterDB | null> {
    if (!supabase) return null;

    const characterName = ownerIdentifier === 'adm' ? 'Aura' : 'Aura (User)';

    const { data: existing, error: fetchError } = await supabase
        .from('characters')
        .select('*')
        .eq('name', characterName)
        .limit(1)
        .maybeSingle();

    if (existing) return existing;

    const { data: newChar, error: createError } = await supabase
      .from('characters')
      .insert([{ 
          name: characterName, 
          is_awake: false, 
          proactive_call_enabled: true 
      }])
      .select()
      .single();

    if (createError) {
        console.error("Erro ao criar personagem:", createError);
        throw createError;
    }
    return newChar;
  },

  async toggleAwakeState(characterId: string, isAwake: boolean) {
    if (!supabase) return;
    const updatePayload: any = { is_awake: isAwake };
    if (isAwake) {
        updatePayload.awakened_at = new Date().toISOString();
    }
    
    const { error } = await supabase.from('characters').update(updatePayload).eq('id', characterId);
    if (error) throw error;

    if (isAwake) {
      await supabase.from('wake_periods').insert([{ character_id: characterId }]);
    } else {
      const { data: lastPeriod } = await supabase
        .from('wake_periods')
        .select('id, started_at')
        .eq('character_id', characterId)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (lastPeriod) {
        const endedAt = new Date();
        await supabase.from('wake_periods').update({ ended_at: endedAt.toISOString() }).eq('id', lastPeriod.id);
      }
    }
  },

  async saveInteraction(characterId: string, type: 'user_message' | 'ai_response' | 'proactive_call', content: string, soul?: SoulState, embedding?: number[]) {
    if (!supabase) return;
    
    const wakePeriodId = await _resolveWakePeriodId(characterId, 'interaction');
    
    const payload: any = {
      character_id: characterId,
      wake_period_id: wakePeriodId,
      type,
      content,
      emotional_snapshot: soul ? {
        happiness: soul.felicidade,
        sadness: soul.tristeza,
        fear: soul.medo,
        anger: soul.raiva,
        disgust: soul.nojo
      } : null
    };
    if (embedding) payload.embedding = embedding;

    const { error } = await supabase.from('interactions').insert([payload]);
    if (error) throw error;
  },

  async saveThought(characterId: string, content: string, soul: SoulState, embedding?: number[]) {
    if (!supabase) return;
    
    const wakePeriodId = await _resolveWakePeriodId(characterId, 'interaction');
    
    const payload: any = {
      character_id: characterId,
      wake_period_id: wakePeriodId,
      content,
      emotional_context: {
        happiness: soul.felicidade,
        sadness: soul.tristeza,
        fear: soul.medo,
        anger: soul.raiva,
        disgust: soul.nojo
      }
    };
    if (embedding) payload.embedding = embedding;

    const { error } = await supabase.from('thoughts').insert([payload]);
    if (error) throw error;
  },

  async updateEmotionalState(characterId: string, newState: SoulState, trigger: string) {
    if (!supabase) return;
    await supabase.from('emotional_states').update({ is_current: false }).eq('character_id', characterId).eq('is_current', true);
    const { error } = await supabase.from('emotional_states').insert([{
      character_id: characterId,
      happiness: newState.felicidade,
      sadness: newState.tristeza,
      fear: newState.medo,
      anger: newState.raiva, 
      disgust: newState.nojo,
      unanswered_questions: newState.perguntas,
      is_current: true,
      trigger_event: trigger
    }]);
    if (error) throw error;
  },

  async getRecentContext(characterId: string, limit = 20): Promise<{ history: Message[], soul: SoulState | null, thoughts: Thought[], dreams: string[] } | null> {
    if (!supabase) return null;
    
    const { data: interactions, error: iErr } = await supabase
      .from('interactions')
      .select('id, type, content, created_at')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data: emotionalState, error: eErr } = await supabase
      .from('emotional_states')
      .select('*')
      .eq('character_id', characterId)
      .eq('is_current', true)
      .maybeSingle();

    const { data: thoughts, error: tErr } = await supabase
      .from('thoughts')
      .select('id, content, created_at')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: dreams, error: dErr } = await supabase
      .from('dreams')
      .select('content')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (iErr || eErr || tErr) throw (iErr || eErr || tErr || dErr);

    return {
      history: (interactions ? interactions.reverse().map((i: any) => ({
        id: i.id || crypto.randomUUID(),
        role: (i.type === 'user_message' ? 'user' : 'ai') as 'user' | 'ai',
        content: String(i.content),
        timestamp: new Date(i.created_at).getTime()
      })) : []) as Message[],
      
      thoughts: (thoughts ? thoughts.reverse().map((t: any) => ({
        id: t.id || crypto.randomUUID(),
        content: t.content,
        timestamp: new Date(t.created_at).getTime(),
        triggeredBy: 'time'
      })) : []) as Thought[],
      
      dreams: dreams ? dreams.map((d: any) => d.content) : [],
      
      soul: emotionalState ? {
        felicidade: emotionalState.happiness,
        tristeza: emotionalState.sadness,
        medo: emotionalState.fear,
        raiva: emotionalState.anger || 0,
        nojo: emotionalState.disgust || 0,
        perguntas: emotionalState.unanswered_questions || []
      } as SoulState : null
    };
  },

  async getStats(characterId: string) {
    if (!supabase) return { wakePeriods: [], emotionalHistory: [], dreams: [] };

    const { data: wakePeriods } = await supabase
      .from('wake_periods')
      .select('*, interactions(count)')
      .eq('character_id', characterId)
      .order('started_at', { ascending: false })
      .limit(5);

    const { data: emotionalHistory } = await supabase
      .from('emotional_states')
      .select('created_at, happiness, sadness, fear, anger, disgust, trigger_event')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(10);
      
    const { data: dreams } = await supabase
      .from('dreams')
      .select('id, content, created_at')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(10);

    const formattedWakePeriods = wakePeriods?.map((wp: any) => ({
        ...wp,
        interactionCount: wp.interactions?.[0]?.count || 0
    })) || [];

    return {
      wakePeriods: formattedWakePeriods,
      emotionalHistory: emotionalHistory || [],
      dreams: dreams || []
    };
  }
};
