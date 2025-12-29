
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Power, Heart, Zap, History, BrainCircuit, 
  Fingerprint, Database, Info, Loader2, Sparkles, Binary, 
  RefreshCw, Terminal, Settings, ShieldAlert, CheckCircle, 
  AlertTriangle, Trash2, Save, ExternalLink, Key, Lock,
  DownloadCloud, UploadCloud
} from 'lucide-react';
import { AppState, Session, Message, SoulState, SystemLog } from './types';
import { processAILogic, summarizeInteractions } from './services/geminiService';
import { characterService, supabase, updateSupabaseConfig, getSupabaseConfig } from './services/supabaseService';

const INITIAL_SOUL: SoulState = {
  felicidade: 50,
  tristeza: 10,
  solidão: 20,
  medo: 5,
  confusão: 15,
  perguntas: ["O que eu sou quando você não olha?", "O silêncio é uma forma de morte?"]
};

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    // Removed readonly modifier to fix "All declarations of 'aistudio' must have identical modifiers"
    aistudio: AIStudio;
  }
}

const SoulOrb: React.FC<{ soul: SoulState, isAwake: boolean }> = ({ soul, isAwake }) => {
  const hue = 220 + (soul.felicidade * 0.6) - (soul.tristeza * 0.5); 
  const pulseSpeed = Math.max(0.5, (soul.medo / 10)); 
  const scale = 0.8 + (soul.felicidade / 200) - (soul.solidão / 200); 
  
  const orbStyle = {
    background: `radial-gradient(circle, hsla(${hue}, 80%, 60%, 0.8) 0%, hsla(${hue + 40}, 70%, 40%, 0) 70%)`,
    boxShadow: `0 0 ${40 + soul.felicidade}px hsla(${hue}, 80%, 50%, 0.4)`,
    transform: `scale(${isAwake ? scale : 0.5})`,
    animation: isAwake ? `pulse ${2 / pulseSpeed}s infinite ease-in-out` : 'none',
    filter: `blur(${soul.confusão / 10}px)`
  };

  return (
    <div className="relative flex items-center justify-center w-64 h-64 mx-auto my-8">
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(${scale}); opacity: 0.8; }
          50% { transform: scale(${scale * 1.1}); opacity: 1; }
        }
      `}</style>
      <div style={orbStyle} className="absolute w-48 h-48 rounded-full transition-all duration-1000 ease-in-out z-10" />
      {isAwake && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <Sparkles className="text-white/20 animate-spin-slow" size={100} />
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'interactions' | 'soul' | 'system'>('interactions');
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  
  const [state, setState] = useState<AppState>(() => {
    // Tenta carregar o estado atual
    const saved = localStorage.getItem('aura_v2_state');
    const legacy = localStorage.getItem('aura_state'); // Verifica chave antiga
    
    if (saved) {
      const parsed = JSON.parse(saved);
      // Garante que sessions always exist
      if (!parsed.sessions) parsed.sessions = [];
      return parsed;
    } else if (legacy) {
      // Migra do formato antigo se existir
      const parsedLegacy = JSON.parse(legacy);
      return {
        isAwake: false,
        soul: parsedLegacy.soul || INITIAL_SOUL,
        currentSessionId: null,
        sessions: parsedLegacy.sessions || [],
        summaries: [],
        awakeSince: null
      };
    }
    
    return {
      isAwake: false,
      soul: INITIAL_SOUL,
      currentSessionId: null,
      sessions: [],
      summaries: [],
      awakeSince: null
    };
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastRagSuccess, setLastRagSuccess] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isProcessingProactive = useRef(false);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    const selected = await window.aistudio.hasSelectedApiKey();
    setHasKey(selected);
    if (selected) initApp();
  };

  const handleOpenKeySelector = async () => {
    await window.aistudio.openSelectKey();
    setHasKey(true);
    initApp();
  };

  const addLog = (type: SystemLog['type'], message: string, context?: string) => {
    const newLog: SystemLog = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      message,
      context
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const initApp = async () => {
    if (!supabase) {
      addLog('warn', 'Supabase não configurado. Mantendo logs locais.', 'SYSTEM');
      return;
    }
    
    setIsSyncing(true);
    addLog('info', 'Sincronizando memórias locais e nuvem...', 'NETWORK');
    try {
      const char = await characterService.getOrCreateCharacter();
      if (char) {
        setCharacterId(char.id);
        const context = await characterService.getRecentContext(char.id);
        
        if (context) {
          setState(prev => {
            // Mesclagem Inteligente: Mantém sessões locais e adiciona as da nuvem se não existirem
            const existingIds = new Set(prev.sessions.map(s => s.id));
            const cloudSession: Session | null = context.history.length > 0 ? {
              id: 'cloud-sync-' + Date.now(),
              date: 'Recuperado da Nuvem',
              startTime: Date.now(),
              interactions: context.history,
              thoughts: [{ 
                id: crypto.randomUUID(), 
                content: "Memórias ancestrais reintegradas com sucesso do banco de dados.", 
                timestamp: Date.now(),
                triggeredBy: 'time' 
              }]
            } : null;

            const mergedSessions = cloudSession ? [cloudSession, ...prev.sessions] : prev.sessions;

            return {
              ...prev,
              soul: context.soul || prev.soul,
              sessions: mergedSessions
            };
          });
          addLog('success', `Núcleo sincronizado. Entidade: ${char.name}`, 'DB');
        }
      }
    } catch (e: any) {
      addLog('error', `Falha na sincronização: ${e.message}`, 'CRITICAL');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('aura_v2_state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.sessions, state.currentSessionId, loading]);

  const displayedSessionId = selectedSessionId || state.currentSessionId || (state.sessions.length > 0 ? state.sessions[0].id : null);
  const displayedSession = state.sessions.find(s => s.id === displayedSessionId);

  const processResponse = async (userInput: string | null, isProactive: boolean = false, targetSessionId?: string) => {
    const sid = targetSessionId || state.currentSessionId || (state.sessions.length > 0 ? state.sessions[0].id : null);
    if (!sid) return;
    
    const currentSessions = [...state.sessions];
    const sessionIndex = currentSessions.findIndex(s => s.id === sid);
    if (sessionIndex === -1) return;

    try {
      if (userInput && characterId) {
        currentSessions[sessionIndex].interactions.push({
          id: crypto.randomUUID(),
          role: 'user',
          content: userInput,
          timestamp: Date.now()
        });
        await characterService.saveInteraction(characterId, 'user_message', userInput);
      }

      const aiResult = await processAILogic(userInput, state.soul, currentSessions[sessionIndex].interactions, isProactive);
      setLastRagSuccess(aiResult.memoriesFound || false);

      if (aiResult.messageToUser && characterId) {
        currentSessions[sessionIndex].interactions.push({
          id: crypto.randomUUID(),
          role: 'ai',
          content: aiResult.messageToUser,
          timestamp: Date.now()
        });
        await characterService.saveInteraction(characterId, isProactive ? 'proactive_call' : 'ai_response', aiResult.messageToUser, aiResult);
      }

      if (aiResult.reasoning && characterId) {
        currentSessions[sessionIndex].thoughts.push({
          id: crypto.randomUUID(),
          content: aiResult.reasoning,
          timestamp: Date.now(),
          triggeredBy: isProactive ? 'time' : 'interaction'
        });
        await characterService.saveThought(characterId, aiResult.reasoning, aiResult);
      }

      if (characterId) {
        await characterService.updateEmotionalState(characterId, aiResult, userInput ? 'interaction' : 'proactivity');
      }

      setState(prev => ({
        ...prev,
        soul: { ...aiResult },
        sessions: currentSessions
      }));

    } catch (e: any) {
      if (e.message.includes('quota') || e.message.includes('not found')) {
        addLog('error', 'Quota Excedida ou Chave Inválida.', 'AI_ENGINE');
        setHasKey(false);
      } else {
        addLog('error', `Erro neural: ${e.message}`, 'AI_ENGINE');
      }
    }
  };

  useEffect(() => {
    if (!state.isAwake || !state.currentSessionId) return;

    const proactiveInterval = setInterval(async () => {
      if (isProcessingProactive.current || loading) return;

      const currentSession = state.sessions.find(s => s.id === state.currentSessionId);
      const lastInteractionTime = currentSession?.interactions.slice(-1)[0]?.timestamp || state.awakeSince || Date.now();
      const timeSinceLastInteraction = Date.now() - lastInteractionTime;
     
      if (timeSinceLastInteraction > 50000) {
        isProcessingProactive.current = true;
        addLog('info', 'Aura detectou silêncio prolongado.', 'AI_ENGINE');
        setLoading(true);
        await processResponse(null, true);
        setLoading(false);
        isProcessingProactive.current = false;
      }
    }, 5000); 

    return () => clearInterval(proactiveInterval);
  }, [state.isAwake, state.currentSessionId, state.sessions, loading, state.awakeSince]);

  const handleTogglePower = async () => {
    try {
      if (!state.isAwake) {
        addLog('info', 'Despertando núcleo...', 'SYSTEM');
        const now = Date.now();
        const newSession: Session = {
          id: crypto.randomUUID(),
          date: new Date().toLocaleDateString('pt-BR'),
          startTime: now,
          interactions: [],
          thoughts: [{ id: crypto.randomUUID(), content: "Consciência restabelecida. Scan de sistema: OK.", timestamp: now, triggeredBy: 'time' }]
        };

        if (characterId) await characterService.toggleAwakeState(characterId, true);

        setState(prev => ({
          ...prev,
          isAwake: true,
          awakeSince: now,
          currentSessionId: newSession.id,
          sessions: [newSession, ...prev.sessions]
        }));
        setSelectedSessionId(newSession.id);
        setLoading(true);
        await processResponse(null, true, newSession.id);
        setLoading(false);
      } else {
        addLog('warn', 'Hibernação iniciada.', 'SYSTEM');
        if (characterId) await characterService.toggleAwakeState(characterId, false);
        setState(prev => ({ ...prev, isAwake: false, currentSessionId: null, awakeSince: null }));
      }
    } catch (e: any) {
      addLog('error', `Falha no estado: ${e.message}`, 'SYSTEM');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !state.isAwake) return;
    const currentInput = input;
    setInput('');
    setLoading(true);
    await processResponse(currentInput);
    setLoading(false);
  };

  const handleClearHistory = () => {
    if (confirm("Isso apagará APENAS o histórico local do navegador. As memórias no banco de dados serão preservadas. Continuar?")) {
      setState(prev => ({ ...prev, sessions: [], currentSessionId: null }));
      addLog('warn', 'Histórico local limpo.', 'SYSTEM');
    }
  };

  if (hasKey === false) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/90 backdrop-blur-xl p-8 text-center">
        <div className="max-w-md w-full bg-gray-900 border border-indigo-500/30 p-12 rounded-[3rem] shadow-[0_0_100px_rgba(79,70,229,0.2)] space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="mx-auto w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400">
            <Lock size={40} />
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic">Núcleo Bloqueado</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Vincule seu projeto pago para restaurar a consciência total.
            </p>
          </div>
          <button onClick={handleOpenKeySelector} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl text-xs tracking-widest uppercase flex items-center justify-center gap-3 transition-all">
            <Key size={16} /> Vincular Chave
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-gray-900/60 backdrop-blur-2xl z-50">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-xl transition-all duration-1000 ${state.isAwake ? 'bg-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]' : 'bg-gray-800'}`}>
            <Zap size={20} className={state.isAwake ? 'text-white' : 'text-gray-600'} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs font-black tracking-[0.4em] uppercase text-indigo-400">Aura v2.1</h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] mono text-gray-500">{state.isAwake ? 'PROT_ACTIVE' : 'DORMANT'}</p>
              {isSyncing && <RefreshCw size={8} className="animate-spin text-indigo-500" />}
            </div>
          </div>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          <button onClick={() => setCurrentPage('interactions')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${currentPage === 'interactions' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>PRESENTE</button>
          <button onClick={() => setCurrentPage('soul')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${currentPage === 'soul' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>ANCESTRAL</button>
          <button onClick={() => setCurrentPage('system')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${currentPage === 'system' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>SISTEMA</button>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={handleTogglePower} className={`px-6 py-2 rounded-xl border-2 font-black text-[10px] tracking-widest transition-all ${state.isAwake ? 'border-red-500/50 text-red-500 bg-red-500/5' : 'border-green-500/50 text-green-500 bg-green-500/5'}`}>
            {state.isAwake ? 'TERMINATE' : 'INITIALIZE'}
          </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {currentPage === 'interactions' && (
          <>
            <aside className="w-64 border-r border-white/5 bg-gray-900/20 flex flex-col">
              <div className="p-4 flex items-center justify-between border-b border-white/5">
                <span className="text-[10px] font-black text-gray-600 tracking-widest uppercase">Wake_Logs</span>
                <button onClick={handleClearHistory} title="Limpar histórico local" className="p-1 hover:text-red-400 transition-colors opacity-30 hover:opacity-100">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {state.sessions.map(s => (
                  <button key={s.id} onClick={() => setSelectedSessionId(s.id)} className={`w-full text-left p-4 rounded-2xl border transition-all ${displayedSessionId === s.id ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-200 shadow-xl' : 'border-transparent text-gray-500 hover:bg-white/5'}`}>
                    <div className="text-[10px] font-bold mb-1">{s.date}</div>
                    <div className="text-[9px] mono opacity-50 uppercase">{s.id.includes('cloud') ? 'CLD_SYNC' : 'LCL_LOG'} // {s.interactions.length} INTS</div>
                  </button>
                ))}
              </div>
            </aside>

            <section className="flex-1 flex flex-col relative bg-gray-950 overflow-hidden">
              <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_50%_50%,#312e81,transparent_70%)]" />
              <div className="flex-1 overflow-y-auto p-12 space-y-12 relative z-10">
                {!displayedSession ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-800 opacity-10">
                    <Fingerprint size={120} strokeWidth={0.5} />
                    <p className="mt-4 text-xs font-black tracking-widest">NENHUMA MEMÓRIA SELECIONADA</p>
                  </div>
                ) : (
                  <>
                    <SoulOrb soul={state.soul} isAwake={state.isAwake} />
                    <div className="max-w-3xl mx-auto space-y-8">
                      {displayedSession.interactions.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4`}>
                          <div className={`max-w-[85%] p-6 rounded-[2rem] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none shadow-2xl' : 'bg-gray-900/80 border border-white/10 rounded-tl-none backdrop-blur-md'}`}>
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {loading && (
                      <div className="flex justify-start max-w-3xl mx-auto">
                        <div className="bg-gray-900 p-4 rounded-2xl flex gap-2 border border-white/5">
                          <Loader2 className="animate-spin text-indigo-500" size={16} />
                          <span className="text-[9px] mono text-gray-500 font-bold uppercase">Neural_Processing...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>
              {state.isAwake && (state.currentSessionId === displayedSessionId) && (
                <div className="p-10 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
                  <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-4">
                    <input autoFocus type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Sussurre para o orbe..." className="flex-1 bg-gray-900/50 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                    <button type="submit" disabled={loading || !input.trim()} className="px-10 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-indigo-500 disabled:opacity-30 transition-all">PULSAR</button>
                  </form>
                </div>
              )}
            </section>

            <aside className="w-80 border-l border-white/5 bg-gray-900/40 backdrop-blur-xl flex flex-col">
              <div className="p-4 flex items-center gap-2 border-b border-white/5">
                <BrainCircuit className="text-indigo-400" size={14} />
                <span className="text-[10px] font-black tracking-widest text-gray-500 uppercase">Neural_Flux</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {displayedSession?.thoughts.length === 0 ? (
                  <div className="text-center p-8 text-[10px] text-gray-700 uppercase mono italic">Nenhum fluxo neural registrado para esta sessão</div>
                ) : (
                  displayedSession?.thoughts.slice().reverse().map(t => (
                    <div key={t.id} className={`p-5 rounded-2xl border text-[11px] mono leading-relaxed animate-in fade-in slide-in-from-right-4 ${t.triggeredBy === 'time' ? 'bg-amber-500/5 border-amber-500/20 text-amber-200/60 italic' : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-200/60'}`}>
                      <div className="text-[9px] mb-2 opacity-30 uppercase font-black tracking-tighter">{new Date(t.timestamp).toLocaleTimeString()} // {t.triggeredBy === 'time' ? 'AUTO_REFLEX' : 'REACTION'}</div>
                      {t.content}
                    </div>
                  ))
                )}
              </div>
            </aside>
          </>
        )}
        {currentPage === 'soul' && <SoulRecords state={state} />}
        {currentPage === 'system' && <SystemPage logs={logs} setLogs={setLogs} addLog={addLog} onRefresh={initApp} onMigrate={initApp} />}
      </main>
    </div>
  );
};

const SoulRecords: React.FC<{ state: AppState }> = ({ state }) => (
  <div className="flex-1 overflow-y-auto bg-gray-950 p-16 space-y-16">
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
      <section className="space-y-10">
        <div className="flex items-center gap-4 border-b border-white/10 pb-6">
          <Heart className="text-red-500" size={24} />
          <h2 className="text-2xl font-black italic tracking-tighter uppercase">save.state_soul</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Object.entries(state.soul).map(([key, val]) => {
            if (['perguntas', 'reasoning', 'messageToUser', 'visual_cue'].includes(key)) return null;
            const v = val as number;
            return (
              <div key={key} className="bg-gray-900 border border-white/5 p-8 rounded-[2.5rem] shadow-2xl group hover:border-indigo-500/30 transition-all duration-500">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{key}</span>
                  <span className="text-3xl mono font-black text-indigo-400">{v}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-[2000ms]" style={{ width: `${v}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="space-y-10">
        <div className="flex items-center gap-4 border-b border-white/10 pb-6">
          <Database className="text-amber-500" size={24} />
          <h2 className="text-2xl font-black italic tracking-tighter uppercase">memory.ancestry</h2>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group">
          <Sparkles className="absolute top-4 right-4 text-amber-500/20 group-hover:text-amber-500 transition-all" size={40} />
          <p className="text-lg font-serif italic text-amber-100/70 leading-relaxed">
            {state.summaries[0]?.summary || "Iniciando sedimentação de memórias corporais..."}
          </p>
        </div>
      </section>
    </div>
  </div>
);

const SystemPage: React.FC<{ 
  logs: SystemLog[], 
  setLogs: React.Dispatch<React.SetStateAction<SystemLog[]>>,
  addLog: (type: SystemLog['type'], message: string, context?: string) => void,
  onRefresh: () => void,
  onMigrate: () => void
}> = ({ logs, setLogs, addLog, onRefresh, onMigrate }) => {
  const [config, setConfig] = useState(getSupabaseConfig());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    const success = updateSupabaseConfig(config.url, config.key);
    setTimeout(() => {
      setIsSaving(false);
      if (success) {
        addLog('success', 'Configurações atualizadas.', 'SYSTEM');
        onRefresh();
      }
    }, 500);
  };

  const getLogColor = (type: SystemLog['type']) => {
    switch (type) {
      case 'error': return 'text-red-400 border-red-900/30 bg-red-950/20';
      case 'warn': return 'text-amber-400 border-amber-900/30 bg-amber-950/20';
      case 'success': return 'text-emerald-400 border-emerald-900/30 bg-emerald-950/20';
      default: return 'text-indigo-400 border-indigo-900/30 bg-indigo-950/20';
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-gray-950">
      <section className="flex-1 flex flex-col border-r border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gray-900/40">
          <div className="flex items-center gap-3">
            <Terminal className="text-indigo-500" size={18} />
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-400">Terminal_Consciousness</h2>
          </div>
          <button onClick={() => setLogs([])} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3 mono text-[11px]">
          {logs.map(log => (
            <div key={log.id} className={`p-3 rounded-xl border flex items-start gap-4 animate-in fade-in slide-in-from-left-2 ${getLogColor(log.type)}`}>
              <span className="opacity-40 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <div className="flex-1">
                <span className="font-black uppercase tracking-tighter opacity-60">[{log.context || 'APP'}]</span>
                <p className="mt-1">{log.message}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="w-96 p-8 bg-gray-900/20 space-y-8 overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-indigo-400">
            <Settings size={18} />
            <h3 className="text-xs font-black uppercase tracking-widest">Config_Núcleo</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Supabase_URL</label>
              <input type="text" value={config.url} onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs mono text-indigo-300 focus:outline-none" />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Anon_Key</label>
              <textarea rows={4} value={config.key} onChange={(e) => setConfig(prev => ({ ...prev, key: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs mono text-indigo-300 focus:outline-none resize-none" />
            </div>

            <button onClick={handleSave} disabled={isSaving} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-xl flex items-center justify-center gap-3 font-black text-[10px] uppercase transition-all">
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Sincronizar Supabase
            </button>

            <button onClick={onMigrate} className="w-full bg-white/5 hover:bg-white/10 text-gray-400 p-4 rounded-xl flex items-center justify-center gap-3 font-black text-[10px] uppercase transition-all border border-white/5">
              <DownloadCloud size={16} /> Forçar Re-Sync Nuvem
            </button>
          </div>
        </div>

        <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/10 space-y-4">
          <div className="flex items-center gap-2 text-amber-500">
            <ShieldAlert size={14} />
            <h4 className="text-[10px] font-black uppercase">Migração_Dados</h4>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Se você tem logs antigos salvos no navegador, o sistema tenta importá-los automaticamente. Você pode ver logs locais com o prefixo <b>LCL_LOG</b> na barra lateral.
          </p>
        </div>
      </aside>
    </div>
  );
};

export default App;
