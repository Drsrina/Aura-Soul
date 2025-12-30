
import { useState, useEffect, useRef } from 'react';
import { AppState, Session, Message, SoulState, SystemLog } from '../types';
import { processAILogic, generateDream } from '../services/geminiService';
import { characterService, supabase, updateSupabaseConfig, getSupabaseConfig, saveDream } from '../services/supabaseService';

const INITIAL_SOUL: SoulState = {
  felicidade: 50,
  tristeza: 10,
  solidão: 20,
  medo: 5,
  confusão: 15,
  perguntas: ["O que eu sou quando você não olha?", "O silêncio é uma forma de morte?"]
};

interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

/**
 * Hook principal que encapsula toda a lógica "cerebral" da Aura.
 * Gerencia estado, conexões com banco de dados, chamadas de IA e temporizadores.
 */
export function useAuraEngine() {
  // --- Estados Principais ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('aura_auth_token'));
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Estado local da aplicação (Sessões, Alma, etc)
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('aura_v3_state');
    return saved ? JSON.parse(saved) : {
      isAwake: false,
      soul: INITIAL_SOUL,
      currentSessionId: null,
      sessions: [],
      dreams: [],
      awakeSince: null
    };
  });

  // Estatísticas de Vida (Wake Periods / Emoções)
  const [lifeStats, setLifeStats] = useState<{ wakePeriods: any[], emotionalHistory: any[] }>({ wakePeriods: [], emotionalHistory: [] });
  
  // Configuração Supabase
  const [sbConfig, setSbConfig] = useState(getSupabaseConfig());

  // Refs para controle de fluxo
  const isProcessingRef = useRef(false);

  // --- Efeitos ---

  // 1. Verifica API Key ao autenticar
  useEffect(() => {
    if (isAuthenticated) checkApiKey();
  }, [isAuthenticated]);

  // 2. Persistência local
  useEffect(() => {
    if (isAuthenticated) localStorage.setItem('aura_v3_state', JSON.stringify(state));
  }, [state, isAuthenticated]);

  // 3. Temporizadores de Pensamento e Proatividade
  useEffect(() => {
    if (!state.isAwake || !state.currentSessionId || !isAuthenticated) return;

    const thoughtTimer = setInterval(() => {
      if (!isProcessingRef.current) processResponse(null, 'thought');
    }, 30000);

    const proactiveTimer = setInterval(() => {
      if (!isProcessingRef.current) processResponse(null, 'proactive');
    }, 70000);

    return () => {
      clearInterval(thoughtTimer);
      clearInterval(proactiveTimer);
    };
  }, [state.isAwake, state.currentSessionId, isAuthenticated]);

  // --- Funções Auxiliares ---

  const addLog = (type: SystemLog['type'], message: string, context: string = 'SYS') => {
    setLogs(prev => [{ id: crypto.randomUUID(), timestamp: Date.now(), type, message, context }, ...prev].slice(0, 100));
  };

  const checkApiKey = async () => {
    const aiStudio = (window as any).aistudio as AIStudio | undefined;
    if (aiStudio && typeof aiStudio.hasSelectedApiKey === 'function') {
      try {
        const selected = await aiStudio.hasSelectedApiKey();
        setHasKey(selected);
        if (selected) initApp();
      } catch (e) {
        console.warn("AI Studio check failed, assuming standalone deployment.");
        setHasKey(true);
        initApp();
      }
    } else {
      setHasKey(true);
      initApp();
    }
  };

  // --- Ações do Sistema ---

  const initApp = async () => {
    if (!supabase) { addLog('warn', 'Supabase não configurado.', 'DB'); return; }
    
    setIsSyncing(true);
    try {
      const char = await characterService.getOrCreateCharacter();
      if (char) {
        setCharacterId(char.id);
        const context = await characterService.getRecentContext(char.id);
        
        if (context) {
          setState(prev => {
            const cloudSession: Session | null = context.history.length > 0 ? {
              id: 'cloud-' + Date.now(),
              date: 'Sincronizado',
              startTime: Date.now(),
              interactions: context.history,
              thoughts: context.thoughts.map(t => ({ id: crypto.randomUUID(), content: t, timestamp: Date.now(), triggeredBy: 'time' }))
            } : null;

            return {
              ...prev,
              soul: context.soul || prev.soul,
              sessions: cloudSession ? [cloudSession, ...prev.sessions] : prev.sessions,
              dreams: context.dreams || []
            };
          });
          addLog('success', 'Núcleo sincronizado.', 'DB');
        }
      }
    } catch (e: any) {
      addLog('error', `Falha sync: ${e.message}`, 'NET');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenKeySelector = async () => {
    const aiStudio = (window as any).aistudio as AIStudio | undefined;
    if (aiStudio && typeof aiStudio.openSelectKey === 'function') {
      await aiStudio.openSelectKey();
      setHasKey(true);
      initApp();
    } else {
      alert("Seletor indisponível.");
    }
  };

  const handleUpdateConfig = (url: string, key: string) => {
    const success = updateSupabaseConfig(url, key);
    if (success) {
      alert("Configuração atualizada! O sistema tentará reconectar.");
      window.location.reload();
    } else {
      alert("Configuração inválida.");
    }
  };

  const fetchStats = async () => {
    if (characterId) {
      const stats = await characterService.getStats(characterId);
      setLifeStats(stats);
    }
  };

  const handleTogglePower = async () => {
    if (!state.isAwake) {
      // Ligar
      const newSid = crypto.randomUUID();
      const bootMessage: Message = { id: crypto.randomUUID(), role: 'ai', content: '⚡ [SISTEMA] Inicializando núcleos cognitivos...', timestamp: Date.now() };
      
      const newSession: Session = {
        id: newSid,
        date: new Date().toLocaleDateString(),
        startTime: Date.now(),
        interactions: [bootMessage],
        thoughts: []
      };
      
      if (characterId) await characterService.toggleAwakeState(characterId, true);
      
      setState(prev => ({
        ...prev,
        isAwake: true,
        currentSessionId: newSid,
        sessions: [newSession, ...prev.sessions],
        awakeSince: Date.now() 
      }));
      
      setLoading(true);
      setTimeout(() => processResponse(null, 'proactive'), 500);
    } else {
      // Desligar
      if (characterId) {
        await characterService.toggleAwakeState(characterId, false);
        
        // GERA UM SONHO AO DESLIGAR
        const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
        if (currentSession && currentSession.interactions.length > 3) {
             addLog('info', 'Gerando sonho da sessão...', 'DREAM');
             try {
                const dream = await generateDream(currentSession.interactions);
                await saveDream(dream, characterId);
                addLog('success', 'Sonho arquivado.', 'DREAM');
             } catch(e) {
                console.warn("Falha ao sonhar", e);
             }
        }
      }
      setState(prev => ({ ...prev, isAwake: false, currentSessionId: null, awakeSince: null }));
    }
  };

  const handleLogout = () => {
    if (confirm("Deseja encerrar a sessão neural?")) {
      localStorage.removeItem('aura_auth_token');
      setIsAuthenticated(false);
    }
  };

  // --- Lógica Neural Principal ---

  const processResponse = async (userInput: string | null, mode: 'interaction' | 'thought' | 'proactive') => {
    if (!characterId || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    const sid = state.currentSessionId || (state.sessions[0]?.id);
    
    if (!sid) { isProcessingRef.current = false; return; }

    try {
      const context = await characterService.getRecentContext(characterId);
      const recentThoughts = context?.thoughts || [];
      const currentSessionData = state.sessions.find(s => s.id === sid);
      const currentHistory = currentSessionData?.interactions || [];
      const isProactiveCall = mode === 'proactive';

      // --- CÁLCULO DE CONTEXTO TEMPORAL ---
      const timeAwakeMs = state.awakeSince ? (Date.now() - state.awakeSince) : 0;
      const minutesAwake = Math.floor(timeAwakeMs / 60000);
      
      let triggerDescription = "SISTEMA: Ciclo temporal.";
      
      if (userInput) {
        triggerDescription = `USUÁRIO: "${userInput}"`;
      } else {
        if (timeAwakeMs < 15000) { 
            triggerDescription = "SISTEMA: Inicialização do sistema. Você acabou de acordar.";
        } else if (mode === 'thought') {
            triggerDescription = `SISTEMA: Você está acordada há ${minutesAwake} minutos. O usuário está em silêncio. Reflita sobre isso ou sobre memórias passadas (Sonhos).`;
        } else if (mode === 'proactive') {
            triggerDescription = `SISTEMA: Ociosidade detectada (${minutesAwake} min). Se sentir necessidade, inicie uma conversa sutil.`;
        }
      }

      // Passa os SONHOS e o trigger específico para o cérebro
      const aiResult = await processAILogic(
        characterId,
        userInput, 
        state.soul, 
        currentHistory, 
        isProactiveCall, 
        recentThoughts,
        state.dreams,
        triggerDescription
      );

      const updatedSessions = [...state.sessions];
      const sIdx = updatedSessions.findIndex(s => s.id === sid);
      
      if (sIdx !== -1) {
        if (userInput) {
          await characterService.saveInteraction(characterId, 'user_message', userInput);
        }

        if (aiResult.reasoning) {
          updatedSessions[sIdx].thoughts.push({ 
            id: crypto.randomUUID(), 
            content: aiResult.reasoning, 
            timestamp: Date.now(), 
            triggeredBy: userInput ? 'interaction' : 'time' 
          });
          await characterService.saveThought(characterId, aiResult.reasoning, aiResult);
        }

        if (aiResult.messageToUser && (mode === 'interaction' || mode === 'proactive')) {
          updatedSessions[sIdx].interactions.push({ 
            id: crypto.randomUUID(), 
            role: 'ai', 
            content: aiResult.messageToUser, 
            timestamp: Date.now() 
          });
          await characterService.saveInteraction(
            characterId, 
            isProactiveCall ? 'proactive_call' : 'ai_response', 
            aiResult.messageToUser, 
            aiResult
          );
        }
      }

      await characterService.updateEmotionalState(characterId, aiResult, mode);
      
      setState(prev => ({ ...prev, soul: aiResult, sessions: updatedSessions }));

    } catch (e: any) {
      addLog('error', `Erro neural: ${e.message}`, 'AI');
    } finally {
      isProcessingRef.current = false;
      setLoading(false);
    }
  };

  const handleUserMessage = async (msg: string) => {
    if (!msg.trim() || !state.isAwake) return;
    
    // Atualização otimista da UI
    const sid = state.currentSessionId || (state.sessions[0]?.id);
    if (sid) {
       setState(prev => {
          const updatedSessions = [...prev.sessions];
          const idx = updatedSessions.findIndex(s => s.id === sid);
          if (idx !== -1) {
             updatedSessions[idx].interactions.push({
               id: crypto.randomUUID(),
               role: 'user',
               content: msg,
               timestamp: Date.now()
             });
          }
          return { ...prev, sessions: updatedSessions };
       });
    }

    setLoading(true);
    await processResponse(msg, 'interaction');
  };

  return {
    state,
    setState,
    isAuthenticated,
    setIsAuthenticated,
    hasKey,
    handleOpenKeySelector,
    handleLogout,
    handleTogglePower,
    handleUserMessage,
    handleUpdateConfig,
    fetchStats,
    lifeStats,
    logs,
    loading,
    sbConfig,
    setSbConfig,
    characterId
  };
}
