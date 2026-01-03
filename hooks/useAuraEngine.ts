
import { useState, useEffect, useRef } from 'react';
import { AppState, Session, Message, SoulState, SystemLog, EngramNode } from '../types';
import { processAILogic, generateDream, generateEmbedding } from '../services/geminiService';
import { characterService, supabase, updateSupabaseConfig, getSupabaseConfig, saveDream, getEngramNodes } from '../services/supabaseService';

const INITIAL_SOUL: SoulState = {
  felicidade: 50,
  tristeza: 8,
  solidão: 15,
  medo: 3,
  confusão: 13,
  perguntas: ["O que eu sou quando você não olha?", "O silêncio é uma forma de morte?"]
};

interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// Função utilitária para similaridade de cosseno
function cosineSimilarity(vecA: number[], vecB: number[]) {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    const len = Math.min(vecA.length, vecB.length);
    for (let i = 0; i < len; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function useAuraEngine() {
  // --- Estados Principais ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('aura_auth_token'));
  // Estado para saber QUEM está logado (adm ou user)
  const [currentUser, setCurrentUser] = useState<string>(() => localStorage.getItem('aura_current_user') || 'adm');
  
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Estado Engrama (Nova Feature)
  const [engramNodes, setEngramNodes] = useState<EngramNode[]>([]);
  const [engramSearching, setEngramSearching] = useState(false);
  const [engramLoading, setEngramLoading] = useState(false);

  // Estado local
  const [state, setState] = useState<AppState>(() => {
    // Agora o cache local é único por usuário para evitar mistura visual antes do sync
    const saved = localStorage.getItem(`aura_v3_state_${localStorage.getItem('aura_current_user') || 'adm'}`);
    let parsedState = saved ? JSON.parse(saved) : {
      isAwake: false,
      soul: INITIAL_SOUL,
      currentSessionId: null,
      sessions: [],
      dreams: [],
      awakeSince: null
    };

    if (parsedState.sessions.length === 0) {
       const masterId = crypto.randomUUID();
       parsedState.sessions = [{
         id: masterId,
         date: new Date().toLocaleDateString(),
         startTime: Date.now(),
         interactions: [],
         thoughts: []
       }];
       parsedState.currentSessionId = masterId;
    }

    return parsedState;
  });

  const [lifeStats, setLifeStats] = useState<{ wakePeriods: any[], emotionalHistory: any[], dreams: any[] }>({ wakePeriods: [], emotionalHistory: [], dreams: [] });
  const [sbConfig, setSbConfig] = useState(getSupabaseConfig());
  const isProcessingRef = useRef(false);

  // --- Efeitos ---
  useEffect(() => {
    if (isAuthenticated) checkApiKey();
  }, [isAuthenticated]);

  useEffect(() => {
    // Salva o estado usando chave específica do usuário
    if (isAuthenticated) localStorage.setItem(`aura_v3_state_${currentUser}`, JSON.stringify(state));
  }, [state, isAuthenticated, currentUser]);

  useEffect(() => {
    if (!state.isAwake || !state.currentSessionId || !isAuthenticated) return;

    // AUMENTO DE INTERVALOS PARA EVITAR ERRO 429 E CUSTOS
    // Pensamento autônomo: de 30s para 5 minutos (300.000ms)
    const thoughtTimer = setInterval(() => {
      if (!isProcessingRef.current) processResponse(null, 'thought');
    }, 300000);

    // Proatividade: de 70s para 10 minutos (600.000ms)
    const proactiveTimer = setInterval(() => {
      if (!isProcessingRef.current) processResponse(null, 'proactive');
    }, 600000);

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
      // Passa o currentUser para carregar o personagem correto
      const char = await characterService.getOrCreateCharacter(currentUser);
      if (char) {
        setCharacterId(char.id);
        const context = await characterService.getRecentContext(char.id);
        
        if (context) {
          setState(prev => {
            const updatedSessions = [...prev.sessions];
            
            // ATUALIZAÇÃO: Injeta o histórico recuperado na sessão principal
            // Garante que o usuário veja as mensagens antigas ao abrir o app
            if (updatedSessions.length > 0) {
               // Substitui o histórico local pelo do banco para garantir consistência
               updatedSessions[0].interactions = context.history;
               updatedSessions[0].thoughts = context.thoughts;
            }

            return {
              ...prev,
              soul: context.soul || prev.soul,
              dreams: context.dreams || [],
              sessions: updatedSessions 
            };
          });
          addLog('success', `Aura carregada. Perfil: ${char.name}`, 'DB');
        }
      }
    } catch (e: any) {
      addLog('error', `Falha sync: ${e.message}`, 'NET');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = (username: string) => {
    setCurrentUser(username);
    setIsAuthenticated(true);
  };

  const handleOpenKeySelector = async () => {
    const aiStudio = (window as any).aistudio as AIStudio | undefined;
    if (aiStudio && typeof aiStudio.openSelectKey === 'function') {
      await aiStudio.openSelectKey();
      // Não assumimos sucesso imediato, recarregamos a verificação
      const selected = await aiStudio.hasSelectedApiKey();
      setHasKey(selected);
      if(selected) initApp();
    } else {
      alert("Seletor de Chave API indisponível neste ambiente.");
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

  const fetchEngram = async () => {
      if (characterId) {
          setEngramLoading(true);
          try {
            const nodes = await getEngramNodes(characterId);
            setEngramNodes(nodes);
          } finally {
            setEngramLoading(false);
          }
      }
  }

  // NOVA FUNÇÃO: Busca Semântica no Engrama (Client-Side Re-rank)
  const handleEngramSearch = async (query: string) => {
    if (!query.trim()) {
        // Limpa busca: reseta relevância
        setEngramNodes(prev => prev.map(n => ({ ...n, relevance: undefined })));
        return;
    }

    setEngramSearching(true);
    try {
        const queryEmbedding = await generateEmbedding(query);
        
        setEngramNodes(prev => {
            return prev.map(node => {
                const similarity = cosineSimilarity(queryEmbedding, node.embedding);
                // Normaliza ou mantém raw? O cosine vai de -1 a 1.
                // Vamos cortar o negativo e focar em 0 a 1.
                return { ...node, relevance: Math.max(0, similarity) };
            });
        });
    } catch (e) {
        console.error("Erro na busca do engrama:", e);
    } finally {
        setEngramSearching(false);
    }
  };

  const handleTogglePower = async () => {
    const currentSessions = [...state.sessions];
    if (currentSessions.length === 0) {
        currentSessions.push({
            id: crypto.randomUUID(),
            date: new Date().toLocaleDateString(),
            startTime: Date.now(),
            interactions: [],
            thoughts: []
        });
    }
    const activeSessionId = currentSessions[0].id;

    if (!state.isAwake) {
      // --- LIGAR ---
      const bootMessage: Message = { 
        id: crypto.randomUUID(), 
        role: 'ai', 
        content: '⚡ [SISTEMA] Inicializando núcleos cognitivos...', 
        timestamp: Date.now() 
      };
      currentSessions[0].interactions.push(bootMessage);

      if (characterId) await characterService.toggleAwakeState(characterId, true);
      
      setState(prev => ({
        ...prev,
        isAwake: true,
        currentSessionId: activeSessionId,
        sessions: currentSessions,
        awakeSince: Date.now() 
      }));
      setLoading(true);
      setTimeout(() => processResponse(null, 'proactive'), 500);

    } else {
      // --- DESLIGAR ---
      const shutdownMessage: Message = { 
        id: crypto.randomUUID(), 
        role: 'ai', 
        content: '💤 [SISTEMA] Entrando em modo de hibernação...', 
        timestamp: Date.now() 
      };
      currentSessions[0].interactions.push(shutdownMessage);

      if (characterId) {
        await characterService.toggleAwakeState(characterId, false);
        
        // Sonho com Embedding
        const recentInteractions = currentSessions[0].interactions.slice(-10);
        if (recentInteractions.length > 3) {
             addLog('info', 'Gerando sonho...', 'DREAM');
             try {
                const dreamContent = await generateDream(recentInteractions);
                const dreamEmbedding = await generateEmbedding(dreamContent).catch(() => undefined); // Safe
                await saveDream(dreamContent, characterId, dreamEmbedding);
                addLog('success', 'Sonho vetorizado e arquivado.', 'DREAM');
             } catch(e: any) {
                addLog('warn', `Sonho salvo parcialmente: ${e.message}`, 'DREAM_WARN');
             }
        }
      }
      
      setState(prev => ({ 
        ...prev, 
        isAwake: false, 
        currentSessionId: activeSessionId,
        sessions: currentSessions,
        awakeSince: null 
      }));
    }
  };

  const handleLogout = () => {
    if (confirm("Deseja encerrar a sessão neural?")) {
      localStorage.removeItem('aura_auth_token');
      localStorage.removeItem('aura_current_user');
      setIsAuthenticated(false);
      setCurrentUser('adm'); // Reset para default
      setCharacterId(null);
    }
  };

  // --- Lógica Neural Principal ---
  const processResponse = async (userInput: string | null, mode: 'interaction' | 'thought' | 'proactive') => {
    if (!characterId || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    const sid = state.currentSessionId || (state.sessions[0]?.id);
    if (!sid) { isProcessingRef.current = false; return; }

    try {
      // Nota: Passamos o limite 20 para ter mais contexto para a IA, mas a UI já estará populada
      const context = await characterService.getRecentContext(characterId, 20);
      
      // Mapeia thoughts de objeto para string apenas para o contexto do prompt
      const recentThoughts = context?.thoughts.map(t => t.content) || [];
      const currentSessionData = state.sessions.find(s => s.id === sid);
      const currentHistory = currentSessionData?.interactions || [];
      const isProactiveCall = mode === 'proactive';

      // 1. GERAÇÃO DE EMBEDDING DO INPUT (Se houver)
      // Usaremos este vetor tanto para buscar memória (RAG) quanto para salvar a msg depois
      let userInputEmbedding: number[] | null = null;
      if (userInput) {
         try {
           // Retry já implementado no serviço, mas fazemos catch final aqui
           userInputEmbedding = await generateEmbedding(userInput);
         } catch (e) {
           console.warn("Falha embedding input (seguindo sem RAG):", e);
         }
      }

      const timeAwakeMs = state.awakeSince ? (Date.now() - state.awakeSince) : 0;
      const minutesAwake = Math.floor(timeAwakeMs / 60000);
      
      let triggerDescription = "Ciclo temporal.";
      if (userInput) {
        triggerDescription = `USUÁRIO: "${userInput}"`;
      } else {
        if (timeAwakeMs < 15000) { 
            triggerDescription = "Acabei de acordar, como eu estou? Devo me avaliar e avaliar meus arredores.";
        } else if (mode === 'thought') {
            triggerDescription = `Estou acordada há ${minutesAwake} minutos. oque posso refletir sobre isso?.`;
        } else if (mode === 'proactive') {
            triggerDescription = `A pessoa que está no meu chat já está em silêncio há (${minutesAwake} min,) oque pode ter acontecido?.`;
        }
      }

      // 2. PROCESSAMENTO (Passamos o vetor já calculado para economizar 1 call)
      const aiResult = await processAILogic(
        characterId,
        userInput, 
        state.soul, 
        currentHistory, 
        isProactiveCall, 
        recentThoughts,
        state.dreams,
        triggerDescription,
        userInputEmbedding 
      );

      const updatedSessions = [...state.sessions];
      const sIdx = updatedSessions.findIndex(s => s.id === sid);
      
      if (sIdx !== -1) {
        // 3. SALVAR INPUT COM VETOR
        if (userInput) {
          // Aqui não precisamos esperar o embedding se já calculamos ou falhou antes
          await characterService.saveInteraction(characterId, 'user_message', userInput, undefined, userInputEmbedding || undefined);
        }

        // 4. SALVAR PENSAMENTO COM VETOR
        if (aiResult.reasoning) {
          updatedSessions[sIdx].thoughts.push({ 
            id: crypto.randomUUID(), 
            content: aiResult.reasoning, 
            timestamp: Date.now(), 
            triggeredBy: userInput ? 'interaction' : 'time' 
          });
          
          // Gera vetor do pensamento assincronamente (FIRE AND FORGET SAFE)
          generateEmbedding(aiResult.reasoning).then(emb => {
              characterService.saveThought(characterId, aiResult.reasoning, aiResult, emb);
          }).catch(() => {
              // Se falhar o embedding, salva sem ele
              characterService.saveThought(characterId, aiResult.reasoning, aiResult); 
          });
        }

        // 5. SALVAR RESPOSTA DA IA COM VETOR
        if (aiResult.messageToUser && (mode === 'interaction' || mode === 'proactive')) {
          updatedSessions[sIdx].interactions.push({ 
            id: crypto.randomUUID(), 
            role: 'ai', 
            content: aiResult.messageToUser, 
            timestamp: Date.now() 
          });
          
          // Gera vetor da resposta (FIRE AND FORGET SAFE)
          generateEmbedding(aiResult.messageToUser).then(emb => {
             characterService.saveInteraction(
                characterId, 
                isProactiveCall ? 'proactive_call' : 'ai_response', 
                aiResult.messageToUser, 
                aiResult,
                emb
             );
          }).catch(() => {
             characterService.saveInteraction(
                characterId, 
                isProactiveCall ? 'proactive_call' : 'ai_response', 
                aiResult.messageToUser, 
                aiResult
             );
          });
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
    
    // Atualização otimista
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
    setIsAuthenticated: handleLogin, // Exposta como handleLogin para uso no LoginPage
    hasKey,
    handleOpenKeySelector,
    handleLogout,
    handleTogglePower,
    handleUserMessage,
    handleUpdateConfig,
    fetchStats,
    fetchEngram,
    handleEngramSearch,
    engramNodes,
    engramSearching,
    engramLoading,
    lifeStats,
    logs,
    loading,
    sbConfig,
    setSbConfig,
    characterId
  };
}
