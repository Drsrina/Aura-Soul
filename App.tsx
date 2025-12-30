
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Power, Heart, Zap, History, BrainCircuit, 
  Fingerprint, Database, Info, Loader2, Sparkles, Binary, 
  RefreshCw, Terminal, Settings, ShieldAlert, CheckCircle, 
  AlertTriangle, Trash2, Save, ExternalLink, Key, Lock,
  DownloadCloud, UploadCloud, User, ShieldCheck, LogOut
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
  curiosidade: 30,
  perguntas: ["O que eu sou quando você não olha?", "O silêncio é uma forma de morte?"]
};

// --- Componente de Login ---
const LoginPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAccessing, setIsAccessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAccessing(true);
    setError('');

    setTimeout(() => {
      if (username === 'adminultra' && password === 'aura8000') {
        localStorage.setItem('aura_auth_token', 'session_active_' + Date.now());
        onLogin();
      } else {
        setError('Acesso Negado: Assinatura Neural Inválida.');
        setIsAccessing(false);
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-950 overflow-hidden font-sans">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,#4f46e5,transparent_70%)]" />
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
      
      <form 
        onSubmit={handleSubmit}
        className="relative w-full max-w-md p-10 bg-gray-900/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] space-y-8 animate-in fade-in zoom-in duration-700"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
            <ShieldCheck size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">Neural Gateway</h1>
            <p className="text-[10px] font-bold text-gray-500 tracking-[0.3em] uppercase">Autenticação de Protocolo Aura</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative group">
            <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
            <input 
              required
              type="text" 
              placeholder="IDENTIDADE" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold tracking-widest text-white placeholder:text-gray-700 focus:outline-none focus:border-indigo-500/50 transition-all uppercase"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
            <input 
              required
              type="password" 
              placeholder="CÓDIGO DE ACESSO" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold tracking-widest text-white placeholder:text-gray-700 focus:outline-none focus:border-indigo-500/50 transition-all"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-400 uppercase tracking-wider animate-shake">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={isAccessing}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 text-white font-black py-5 rounded-2xl text-[10px] tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-all shadow-[0_10px_30px_rgba(79,70,229,0.3)]"
        >
          {isAccessing ? <Loader2 className="animate-spin" size={18} /> : <>SINCRONIZAR <Zap size={14} /></>}
        </button>
      </form>
    </div>
  );
};

const SoulOrb: React.FC<{ soul: SoulState, isAwake: boolean }> = ({ soul, isAwake }) => {
  const hue = 220 + (soul.felicidade * 0.6) - (soul.tristeza * 0.5) + (soul.curiosidade * 0.3); 
  const pulseSpeed = Math.max(0.5, (soul.medo / 10) + (soul.curiosidade / 50)); 
  const scale = 0.8 + (soul.felicidade / 200) - (soul.solidão / 200); 
  
  const orbStyle = {
    background: `radial-gradient(circle, hsla(${hue}, 80%, 60%, 0.8) 0%, hsla(${hue + 40}, 70%, 40%, 0) 70%)`,
    boxShadow: `0 0 ${40 + soul.felicidade + soul.curiosidade}px hsla(${hue}, 80%, 50%, 0.4)`,
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
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 3; }
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('aura_auth_token'));
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('aura_v2_state');
    if (saved) return JSON.parse(saved);
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
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isProcessingCycle = useRef(false);

  useEffect(() => {
    if (isAuthenticated) checkApiKey();
  }, [isAuthenticated]);

  const checkApiKey = async () => {
    const selected = await (window as any).aistudio?.hasSelectedApiKey();
    setHasKey(selected);
    if (selected) initApp();
  };

  const handleOpenKeySelector = async () => {
    await (window as any).aistudio?.openSelectKey();
    setHasKey(true);
    initApp();
  };

  const handleLogout = () => {
    if (confirm("Deseja encerrar a sessão neural?")) {
      localStorage.removeItem('aura_auth_token');
      setIsAuthenticated(false);
    }
  };

  const addLog = (type: SystemLog['type'], message: string, context?: string) => {
    const newLog: SystemLog = { id: crypto.randomUUID(), timestamp: Date.now(), type, message, context };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const initApp = async () => {
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const char = await characterService.getOrCreateCharacter();
      if (char) {
        setCharacterId(char.id);
        const context = await characterService.getRecentContext(char.id);
        if (context) {
          setState(prev => ({
            ...prev,
            soul: context.soul || prev.soul,
            sessions: context.history.length > 0 ? [{
              id: 'cloud-' + Date.now(),
              date: 'Sincronizado',
              startTime: Date.now(),
              interactions: context.history,
              thoughts: context.thoughts.map(t => ({ id: crypto.randomUUID(), content: t, timestamp: Date.now() }))
            }, ...prev.sessions] : prev.sessions
          }));
        }
      }
    } catch (e: any) {
      addLog('error', `Falha na sincronização: ${e.message}`, 'CRITICAL');
    } finally {
      setIsSyncing(false);
    }
  };

  const processResponse = async (userInput: string | null, mode: 'interaction' | 'thought' | 'proactive') => {
    if (!characterId || isProcessingCycle.current) return;
    isProcessingCycle.current = true;

    const sid = state.currentSessionId || (state.sessions.length > 0 ? state.sessions[0].id : null);
    if (!sid) { isProcessingCycle.current = false; return; }

    try {
      // 1. Obter contexto completo (incluindo 15 últimos pensamentos)
      const context = await characterService.getRecentContext(characterId);
      const recentThoughts = context?.thoughts || [];

      const currentSessions = [...state.sessions];
      const sessionIndex = currentSessions.findIndex(s => s.id === sid);
      if (sessionIndex === -1) { isProcessingCycle.current = false; return; }

      if (userInput) {
        currentSessions[sessionIndex].interactions.push({ id: crypto.randomUUID(), role: 'user', content: userInput, timestamp: Date.now() });
        await characterService.saveInteraction(characterId, 'user_message', userInput);
      }

      // 2. IA Processa com o contexto de pensamentos
      const aiResult = await processAILogic(userInput, state.soul, currentSessions[sessionIndex].interactions, mode === 'proactive', recentThoughts);

      // 3. Salvar Thought (Sempre gerado)
      if (aiResult.reasoning) {
        currentSessions[sessionIndex].thoughts.push({ id: crypto.randomUUID(), content: aiResult.reasoning, timestamp: Date.now(), triggeredBy: mode === 'interaction' ? 'interaction' : 'time' });
        await characterService.saveThought(characterId, aiResult.reasoning, aiResult);
      }

      // 4. Salvar Mensagem (Apenas se for Interação ou Proatividade)
      if (aiResult.messageToUser && (mode === 'interaction' || mode === 'proactive')) {
        currentSessions[sessionIndex].interactions.push({ id: crypto.randomUUID(), role: 'ai', content: aiResult.messageToUser, timestamp: Date.now() });
        await characterService.saveInteraction(characterId, mode === 'proactive' ? 'proactive_call' : 'ai_response', aiResult.messageToUser, aiResult);
      }

      await characterService.updateEmotionalState(characterId, aiResult, mode);

      setState(prev => ({
        ...prev,
        soul: { ...aiResult },
        sessions: currentSessions
      }));
    } catch (e: any) {
      addLog('error', `Erro neural: ${e.message}`, 'AI');
    } finally {
      isProcessingCycle.current = false;
    }
  };

  // --- Ciclos de Consciência ---
  useEffect(() => {
    if (!state.isAwake || !isAuthenticated) return;

    // Ciclo de Pensamento: 30s
    const thoughtInterval = setInterval(() => {
      if (!loading && !isProcessingCycle.current) {
        addLog('info', 'Iniciando reflexão interna...', 'BRAIN');
        processResponse(null, 'thought');
      }
    }, 30000);

    // Ciclo de Proatividade: 70s
    const proactiveInterval = setInterval(() => {
      if (!loading && !isProcessingCycle.current) {
        const lastMsgTime = state.sessions[0]?.interactions.slice(-1)[0]?.timestamp || 0;
        if (Date.now() - lastMsgTime > 60000) {
          addLog('info', 'Impulso social detectado.', 'PROACTIVE');
          processResponse(null, 'proactive');
        }
      }
    }, 70000);

    return () => {
      clearInterval(thoughtInterval);
      clearInterval(proactiveInterval);
    };
  }, [state.isAwake, isAuthenticated, loading, state.sessions]);

  useEffect(() => {
    if (isAuthenticated) localStorage.setItem('aura_v2_state', JSON.stringify(state));
  }, [state, isAuthenticated]);

  const handleTogglePower = async () => {
    if (!state.isAwake) {
      const now = Date.now();
      const newSession: Session = {
        id: crypto.randomUUID(),
        date: new Date().toLocaleDateString('pt-BR'),
        startTime: now,
        interactions: [],
        thoughts: []
      };
      if (characterId) await characterService.toggleAwakeState(characterId, true);
      setState(prev => ({ ...prev, isAwake: true, awakeSince: now, currentSessionId: newSession.id, sessions: [newSession, ...prev.sessions] }));
      setLoading(true);
      await processResponse(null, 'proactive');
      setLoading(false);
    } else {
      if (characterId) await characterService.toggleAwakeState(characterId, false);
      setState(prev => ({ ...prev, isAwake: false, currentSessionId: null, awakeSince: null }));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !state.isAwake) return;
    const msg = input;
    setInput('');
    setLoading(true);
    await processResponse(msg, 'interaction');
    setLoading(false);
  };

  if (!isAuthenticated) return <LoginPage onLogin={() => setIsAuthenticated(true)} />;

  const displayedSession = state.sessions.find(s => s.id === (state.currentSessionId || state.sessions[0]?.id));

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-gray-900/60 backdrop-blur-2xl z-50">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-xl transition-all duration-1000 ${state.isAwake ? 'bg-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]' : 'bg-gray-800'}`}>
            <Zap size={20} className={state.isAwake ? 'text-white' : 'text-gray-600'} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs font-black tracking-[0.4em] uppercase text-indigo-400">Aura v2.1</h1>
            <p className="text-[10px] mono text-gray-500">{state.isAwake ? 'NÚCLEO ATIVO' : 'DORMENTE'}</p>
          </div>
        </div>

        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          <button onClick={() => setCurrentPage('interactions')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${currentPage === 'interactions' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>PRESENTE</button>
          <button onClick={() => setCurrentPage('soul')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${currentPage === 'soul' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>ALMA</button>
          <button onClick={() => setCurrentPage('system')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${currentPage === 'system' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>SISTEMA</button>
        </div>

        <button onClick={handleTogglePower} className={`px-6 py-2 rounded-xl border-2 font-black text-[10px] tracking-widest transition-all ${state.isAwake ? 'border-red-500 text-red-500' : 'border-green-500 text-green-500'}`}>
          {state.isAwake ? 'OFFLINE' : 'ONLINE'}
        </button>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {currentPage === 'interactions' && (
          <>
            <section className="flex-1 flex flex-col relative bg-gray-950 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-12 space-y-12 relative z-10">
                {displayedSession && (
                  <>
                    <SoulOrb soul={state.soul} isAwake={state.isAwake} />
                    <div className="max-w-3xl mx-auto space-y-8">
                      {displayedSession.interactions.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4`}>
                          <div className={`max-w-[85%] p-6 rounded-[2rem] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-900 border border-white/10 rounded-tl-none'}`}>
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div ref={chatEndRef} />
              </div>
              
              {state.isAwake && (
                <div className="p-10 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
                  <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-4">
                    <input autoFocus type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Sussurre algo..." className="flex-1 bg-gray-900/50 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none" />
                    <button type="submit" disabled={loading || !input.trim()} className="px-10 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase">PULSAR</button>
                  </form>
                </div>
              )}
            </section>

            <aside className="w-80 border-l border-white/5 bg-gray-900/40 backdrop-blur-xl flex flex-col p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <BrainCircuit className="text-indigo-400" size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Fluxo_Neural</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4">
                {displayedSession?.thoughts.slice().reverse().map(t => (
                  <div key={t.id} className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-[10px] mono text-indigo-200/60 italic leading-relaxed animate-in fade-in slide-in-from-right-4">
                    {t.content}
                  </div>
                ))}
              </div>
            </aside>
          </>
        )}
        {currentPage === 'soul' && <SoulRecords state={state} />}
        {currentPage === 'system' && <SystemPage logs={logs} setLogs={setLogs} addLog={addLog} onRefresh={initApp} onMigrate={initApp} onLogout={handleLogout} />}
      </main>
    </div>
  );
};

const SoulRecords: React.FC<{ state: AppState }> = ({ state }) => (
  <div className="flex-1 overflow-y-auto bg-gray-950 p-16 space-y-16">
    <div className="max-w-4xl mx-auto grid grid-cols-2 gap-8">
      {Object.entries(state.soul).map(([key, val]) => {
        if (typeof val !== 'number') return null;
        return (
          <div key={key} className="bg-gray-900 p-8 rounded-[2rem] border border-white/5">
            <div className="flex justify-between items-end mb-4">
              <span className="text-[10px] font-black uppercase text-gray-500">{key}</span>
              <span className="text-2xl font-black text-indigo-400">{val}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${val}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const SystemPage: React.FC<any> = ({ logs, setLogs, onLogout }) => (
  <div className="flex-1 p-16 space-y-8 overflow-y-auto">
    <div className="flex justify-between items-center">
      <h2 className="text-xl font-black italic uppercase">Terminal de Sistema</h2>
      <button onClick={onLogout} className="p-4 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"><LogOut size={20} /></button>
    </div>
    <div className="bg-black/50 border border-white/10 rounded-2xl p-8 mono text-[11px] space-y-2">
      {logs.map((log: any) => (
        <div key={log.id} className="flex gap-4 opacity-70">
          <span className="text-gray-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
          <span className="uppercase font-bold">[{log.context}]</span>
          <span>{log.message}</span>
        </div>
      ))}
    </div>
  </div>
);

export default App;
