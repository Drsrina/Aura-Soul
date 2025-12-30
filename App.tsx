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
  perguntas: ["O que eu sou quando você não olha?", "O silêncio é uma forma de morte?"]
};

interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    readonly aistudio: AIStudio;
  }
}

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
      
      <form onSubmit={handleSubmit} className="relative w-full max-w-md p-10 bg-gray-900/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] space-y-8 animate-in fade-in zoom-in duration-700">
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
            <input required type="text" placeholder="IDENTIDADE" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold tracking-widest text-white placeholder:text-gray-700 focus:outline-none focus:border-indigo-500/50 transition-all uppercase" />
          </div>
          <div className="relative group">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
            <input required type="password" placeholder="CÓDIGO DE ACESSO" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold tracking-widest text-white placeholder:text-gray-700 focus:outline-none focus:border-indigo-500/50 transition-all" />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-[10px] font-bold text-red-400 uppercase tracking-wider animate-shake">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <button type="submit" disabled={isAccessing} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 text-white font-black py-5 rounded-2xl text-[10px] tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-all shadow-[0_10px_30px_rgba(79,70,229,0.3)]">
          {isAccessing ? <Loader2 className="animate-spin" size={18} /> : <>SINCRONIZAR <Zap size={14} /></>}
        </button>
      </form>
    </div>
  );
};

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!localStorage.getItem('aura_auth_token'));
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('aura_v3_state');
    return saved ? JSON.parse(saved) : {
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
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated) checkApiKey();
  }, [isAuthenticated]);

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

  const handleLogout = () => {
    if (confirm("Deseja encerrar a sessão neural?")) {
      localStorage.removeItem('aura_auth_token');
      setIsAuthenticated(false);
    }
  };

  const addLog = (type: SystemLog['type'], message: string, context: string = 'SYS') => {
    setLogs(prev => [{ id: crypto.randomUUID(), timestamp: Date.now(), type, message, context }, ...prev].slice(0, 100));
  };

  const initApp = async () => {
    if (!supabase) { addLog('warn', 'Supabase não configurado.'); return; }
    
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
              sessions: cloudSession ? [cloudSession, ...prev.sessions] : prev.sessions
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

  const processResponse = async (userInput: string | null, mode: 'interaction' | 'thought' | 'proactive') => {
    if (!characterId || isProcessingRef.current) return;
    
    // Bloqueio para evitar sobreposição de chamadas
    isProcessingRef.current = true;

    const sid = state.currentSessionId || (state.sessions[0]?.id);
    if (!sid) { isProcessingRef.current = false; return; }

    try {
      // 1. Busca contexto completo com pensamentos (Atualização Crítica)
      const context = await characterService.getRecentContext(characterId);
      const recentThoughts = context?.thoughts || [];

      // 2. Chama IA
      const currentHistory = state.sessions.find(s => s.id === sid)?.interactions || [];
      const isProactiveCall = mode === 'proactive';
      
      const aiResult = await processAILogic(userInput, state.soul, currentHistory, isProactiveCall, recentThoughts);

      // 3. Atualiza Dados Local e Remoto
      const updatedSessions = [...state.sessions];
      const sIdx = updatedSessions.findIndex(s => s.id === sid);
      
      if (sIdx !== -1) {
        if (userInput) {
          updatedSessions[sIdx].interactions.push({ id: crypto.randomUUID(), role: 'user', content: userInput, timestamp: Date.now() });
          await characterService.saveInteraction(characterId, 'user_message', userInput);
        }

        if (aiResult.reasoning) {
          updatedSessions[sIdx].thoughts.push({ id: crypto.randomUUID(), content: aiResult.reasoning, timestamp: Date.now(), triggeredBy: userInput ? 'interaction' : 'time' });
          await characterService.saveThought(characterId, aiResult.reasoning, aiResult);
        }

        if (aiResult.messageToUser && (mode === 'interaction' || mode === 'proactive')) {
          updatedSessions[sIdx].interactions.push({ id: crypto.randomUUID(), role: 'ai', content: aiResult.messageToUser, timestamp: Date.now() });
          await characterService.saveInteraction(characterId, isProactiveCall ? 'proactive_call' : 'ai_response', aiResult.messageToUser, aiResult);
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

  // --- Cronômetros Separados ---
  useEffect(() => {
    if (!state.isAwake || !state.currentSessionId || !isAuthenticated) return;

    // Timer de Pensamento (30s)
    const thoughtTimer = setInterval(() => {
      if (!isProcessingRef.current) {
        addLog('info', 'Gerando pensamento interno (30s)...', 'BRAIN');
        processResponse(null, 'thought');
      }
    }, 30000);

    // Timer Proativo (70s)
    const proactiveTimer = setInterval(() => {
      if (!isProcessingRef.current) {
        addLog('info', 'Avaliando interação proativa (70s)...', 'SOCIAL');
        processResponse(null, 'proactive');
      }
    }, 70000);

    return () => {
      clearInterval(thoughtTimer);
      clearInterval(proactiveTimer);
    };
  }, [state.isAwake, state.currentSessionId, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) localStorage.setItem('aura_v3_state', JSON.stringify(state));
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state, isAuthenticated]);

  const handleTogglePower = async () => {
    if (!state.isAwake) {
      const newSid = crypto.randomUUID();
      const newSession: Session = {
        id: newSid,
        date: new Date().toLocaleDateString(),
        startTime: Date.now(),
        interactions: [],
        thoughts: []
      };
      
      if (characterId) await characterService.toggleAwakeState(characterId, true);
      
      setState(prev => ({
        ...prev,
        isAwake: true,
        currentSessionId: newSid,
        sessions: [newSession, ...prev.sessions]
      }));
      
      // Gatilho inicial
      setLoading(true);
      await processResponse(null, 'proactive');
    } else {
      if (characterId) await characterService.toggleAwakeState(characterId, false);
      setState(prev => ({ ...prev, isAwake: false, currentSessionId: null }));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !state.isAwake) return;
    const msg = input;
    setInput('');
    setLoading(true);
    await processResponse(msg, 'interaction');
  };

  const displayedSessionId = selectedSessionId || state.currentSessionId || (state.sessions[0]?.id);
  const displayedSession = state.sessions.find(s => s.id === displayedSessionId);

  // Renderização Condicional de Auth
  if (!isAuthenticated) return <LoginPage onLogin={() => setIsAuthenticated(true)} />;

  if (hasKey === false) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/90 p-8 text-center">
        <div className="max-w-md w-full bg-gray-900 border border-indigo-500/30 p-12 rounded-[3rem] space-y-8">
          <h2 className="text-2xl font-black text-white uppercase italic">Núcleo Bloqueado</h2>
          <button onClick={handleOpenKeySelector} className="w-full bg-indigo-600 p-4 rounded-2xl text-xs uppercase font-black">Vincular Chave</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-gray-900/60 backdrop-blur-2xl z-50">
        <div className="flex items-center gap-4">
          <Zap size={20} className={state.isAwake ? 'text-indigo-400' : 'text-gray-600'} />
          <h1 className="text-xs font-black tracking-widest uppercase text-indigo-400">Aura v2.2</h1>
        </div>
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          <button onClick={() => setCurrentPage('interactions')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest ${currentPage === 'interactions' ? 'bg-indigo-600' : 'text-gray-500'}`}>DIÁLOGO</button>
          <button onClick={() => setCurrentPage('soul')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest ${currentPage === 'soul' ? 'bg-indigo-600' : 'text-gray-500'}`}>ESSÊNCIA</button>
          <button onClick={() => setCurrentPage('system')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest ${currentPage === 'system' ? 'bg-indigo-600' : 'text-gray-500'}`}>SISTEMA</button>
        </div>
        <button onClick={handleTogglePower} className={`px-6 py-2 rounded-xl border-2 font-black text-[10px] tracking-widest ${state.isAwake ? 'border-red-500 text-red-500' : 'border-green-500 text-green-500'}`}>
          {state.isAwake ? 'DESLIGAR' : 'LIGAR'}
        </button>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {currentPage === 'interactions' && (
          <>
            <aside className="w-64 border-r border-white/5 bg-gray-900/20 flex flex-col p-2 space-y-2 overflow-y-auto">
               <div className="p-4 text-[10px] font-black text-gray-600 uppercase">Sessões</div>
               {state.sessions.map(s => (
                 <button key={s.id} onClick={() => setSelectedSessionId(s.id)} className={`w-full text-left p-4 rounded-xl border ${displayedSessionId === s.id ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-200' : 'border-transparent text-gray-500'}`}>
                   <div className="text-[10px] font-bold">{s.date}</div>
                   <div className="text-[9px] mono opacity-50">{s.interactions.length} msgs</div>
                 </button>
               ))}
            </aside>

            <section className="flex-1 flex flex-col relative bg-gray-950 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-12 space-y-8 relative z-10">
                <SoulOrb soul={state.soul} isAwake={state.isAwake} />
                <div className="max-w-3xl mx-auto space-y-6">
                  {displayedSession?.interactions.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                      <div className={`max-w-[85%] p-5 rounded-[2rem] text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-900 border border-white/10 rounded-tl-none'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {loading && <div className="text-center text-[10px] mono text-indigo-400 animate-pulse">PROCESSANDO_DADOS_NEURAIS...</div>}
                  <div ref={chatEndRef} />
                </div>
              </div>
              
              {state.isAwake && displayedSessionId === state.currentSessionId && (
                <div className="p-8 bg-gray-950 border-t border-white/5">
                  <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-4">
                    <input autoFocus type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Interagir com a Aura..." className="flex-1 bg-gray-900 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-indigo-500/50" />
                    <button type="submit" disabled={loading} className="px-8 bg-indigo-600 rounded-2xl font-black text-[10px] uppercase">Enviar</button>
                  </form>
                </div>
              )}
            </section>

            <aside className="w-80 border-l border-white/5 bg-gray-900/40 backdrop-blur-xl flex flex-col">
              <div className="p-4 border-b border-white/5 flex items-center gap-2">
                <BrainCircuit size={14} className="text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Fluxo de Pensamento</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {displayedSession?.thoughts.slice().reverse().map(t => (
                  <div key={t.id} className={`p-4 rounded-xl border text-[10px] mono leading-relaxed ${t.triggeredBy === 'time' ? 'bg-amber-500/5 border-amber-500/20 text-amber-200/60 italic' : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-200/60'}`}>
                    <div className="text-[8px] opacity-30 mb-1">{new Date(t.timestamp).toLocaleTimeString()} // {t.triggeredBy === 'time' ? 'AUTO' : 'TRIGGER'}</div>
                    {t.content}
                  </div>
                ))}
              </div>
            </aside>
          </>
        )}

        {currentPage === 'soul' && (
          <div className="flex-1 p-16 grid grid-cols-2 gap-8 max-w-4xl mx-auto overflow-y-auto">
            {Object.entries(state.soul).map(([k, v]) => typeof v === 'number' && (
              <div key={k} className="bg-gray-900 p-8 rounded-[2rem] border border-white/5 space-y-4">
                <div className="flex justify-between items-end"><span className="text-[10px] font-black uppercase text-gray-600">{k}</span><span className="text-2xl font-black text-indigo-400">{v}%</span></div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${v}%` }} /></div>
              </div>
            ))}
          </div>
        )}

        {currentPage === 'system' && (
          <div className="flex-1 p-8 overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
               <h2 className="text-xl font-black uppercase italic">Logs do Sistema</h2>
               <button onClick={handleLogout} className="p-2 bg-red-500/10 text-red-500 rounded-lg"><LogOut size={16}/></button>
            </div>
            <div className="mono text-[11px] space-y-2">
              {logs.map(l => <div key={l.id} className={l.type === 'error' ? 'text-red-400' : 'text-gray-500'}>[{new Date(l.timestamp).toLocaleTimeString()}] [{l.context}] {l.message}</div>)}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;