
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SoulState, Message } from '../types';

// Storage keys
const CONFIG_KEY = 'aura_supabase_config';

const getInitialConfig = () => {
  const saved = localStorage.getItem(CONFIG_KEY);
  if (saved) return JSON.parse(saved);
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  };
};

let config = getInitialConfig();
export let supabase: SupabaseClient | null = (config.url && config.key) 
  ? createClient(config.url, config.key)
  : null;

// Hook for UI to update config
export const updateSupabaseConfig = (url: string, key: string) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, key }));
  config = { url, key };
  supabase = (url && key) ? createClient(url, key) : null;
  return !!supabase;
};

export const getSupabaseConfig = () => config;

// --- Tipos de Banco de Dados ---
export interface CharacterDB {
  id: string;
  name: string;
  is_awake: boolean;
  proactive_call_enabled: boolean;
}

// --- Lógica de Memória Vetorial (RAG) ---
export async function getRelevantMemories(embedding: number[], characterId: string = 'default-aura'): Promise<string[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.rpc('match_memories', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 3,
      character_uuid: characterId
    });
    if (error) throw error;
    return (data as any[]).map(m => m.content);
  } catch (err) {
    console.error('RAG Error:', err);
    throw err;
  }
}

export async function saveMemory(content: string, embedding: number[], characterId: string = 'default-aura') {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('memories').insert({
      character_id: characterId,
      content,
      embedding,
      memory_type: 'recent'
    });
    if (error) throw error;
  } catch (err) {
    console.error('Save Memory Error:', err);
    throw err;
  }
}

export const characterService = {
  async getOrCreateCharacter(): Promise<CharacterDB | null> {
    if (!supabase) return null;
    const { data: existing, error: fetchError } = await supabase.from('characters').select('*').limit(1).maybeSingle();
    if (existing) return existing;

    const { data: newChar, error: createError } = await supabase
      .from('characters')
      .insert([{ name: 'Aura', is_awake: false, proactive_call_enabled: true }])
      .select()
      .single();

    if (createError) throw createError;
    return newChar;
  },

  async toggleAwakeState(characterId: string, isAwake: boolean) {
    if (!supabase) return;
    const { error } = await supabase.from('characters').update({ 
      is_awake: isAwake,
      awakened_at: isAwake ? new Date().toISOString() : null 
    }).eq('id', characterId);

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

  async saveInteraction(characterId: string, type: 'user_message' | 'ai_response' | 'proactive_call', content: string, soul?: SoulState) {
    if (!supabase) return;
    const { data: currentPeriod } = await supabase.from('wake_periods').select('id').eq('character_id', characterId).is('ended_at', null).maybeSingle();
    
    const { error } = await supabase.from('interactions').insert([{
      character_id: characterId,
      wake_period_id: currentPeriod?.id,
      type,
      content,
      emotional_snapshot: soul ? {
        happiness: soul.felicidade,
        sadness: soul.tristeza,
        loneliness: soul.solidão,
        fear: soul.medo,
        confusion: soul.confusão
      } : null
    }]);
    if (error) throw error;
  },

  async saveThought(characterId: string, content: string, soul: SoulState) {
    if (!supabase) return;
    const { data: currentPeriod } = await supabase.from('wake_periods').select('id').eq('character_id', characterId).is('ended_at', null).maybeSingle();
    const { error } = await supabase.from('thoughts').insert([{
      character_id: characterId,
      wake_period_id: currentPeriod?.id,
      content,
      emotional_context: {
        happiness: soul.felicidade,
        sadness: soul.tristeza,
        loneliness: soul.solidão,
        fear: soul.medo,
        confusion: soul.confusão
      }
    }]);
    if (error) throw error;
  },

  async updateEmotionalState(characterId: string, newState: SoulState, trigger: string) {
    if (!supabase) return;
    await supabase.from('emotional_states').update({ is_current: false }).eq('character_id', characterId).eq('is_current', true);
    const { error } = await supabase.from('emotional_states').insert([{
      character_id: characterId,
      happiness: newState.felicidade,
      sadness: newState.tristeza,
      loneliness: newState.solidão,
      fear: newState.medo,
      confusion: newState.confusão,
      unanswered_questions: newState.perguntas,
      is_current: true,
      trigger_event: trigger
    }]);
    if (error) throw error;
  },

  async getRecentContext(characterId: string, limit = 15): Promise<{ history: Message[], soul: SoulState | null } | null> {
    if (!supabase) return null;
    const { data: interactions, error: iErr } = await supabase
      .from('interactions')
      .select('type, content, created_at')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data: emotionalState, error: eErr } = await supabase
      .from('emotional_states')
      .select('*')
      .eq('character_id', characterId)
      .eq('is_current', true)
      .maybeSingle();

    if (iErr || eErr) throw (iErr || eErr);

    return {
      history: (interactions ? interactions.reverse().map((i: any) => ({
        id: crypto.randomUUID(),
        role: (i.type === 'user_message' ? 'user' : 'ai') as 'user' | 'ai',
        content: String(i.content),
        timestamp: new Date(i.created_at).getTime()
      })) : []) as Message[],
      soul: emotionalState ? {
        felicidade: emotionalState.happiness,
        tristeza: emotionalState.sadness,
        solidão: emotionalState.loneliness,
        // Map database fields correctly to SoulState property names 'medo' and 'confusão'
        medo: emotionalState.fear,
        confusão: emotionalState.confusion,
        perguntas: emotionalState.unanswered_questions || []
      } as SoulState : null
    };
  }
};
