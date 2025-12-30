
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Power, Heart, Zap, History, BrainCircuit, 
  Fingerprint, Database, Info, Loader2, Sparkles, Binary, 
  RefreshCw, Terminal, Settings, ShieldAlert, CheckCircle, 
  AlertTriangle, Trash2, Save, ExternalLink, Key, Lock,
  DownloadCloud, UploadCloud, User, ShieldCheck, LogOut, Activity, Clock, Smile, Frown, Ghost
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
    <div className="relative flex items-center justify-center w-64 h-64 mx-auto my-4">
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

// --- Mini Status Bar para a página principal ---
const SoulStatus: React.FC<{ soul: SoulState }> = ({ soul }) => {
  return (
    <div className="flex justify-center gap-4 mb-4">
      <div className="bg-gray-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
        <Smile size={14} className="text-yellow-400" />
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-wider text-gray-500 font-bold">Felicidade</span>
          <span className="text-xs font-mono font-bold text-white">{soul.felicidade}%</span>
        </div>
      </div>
      <div className="bg-gray-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
        <Frown size={14} className="text-blue-400" />
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-wider text-gray-500 font-bold">Tristeza</span>
          <span className="text-xs font-mono font-bold text-white">{soul.tristeza}%</span>
        </div>
      </div>
      <div className="bg-gray-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
        <Ghost size={14} className="text-purple-400" />
        <div className="flex flex-col">
          <span className="text-[8px] uppercase tracking-wider text-gray-500 font-bold">Solidão</span>
          <span className="text-xs font-mono font-bold text-white">{soul.solidão}%</span>
        </div>
      </div>
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
  
  // Stats para página de Essência
  const [lifeStats, setLifeStats] = useState<{ wakePeriods: any[], emotionalHistory: any[] }>({ wakePeriods: [], emotionalHistory: [] });

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

  // Configuração Supabase Local
  const [sbConfig, setSbConfig] = useState(getSupabaseConfig());

  useEffect(() => {
    if (isAuthenticated) checkApiKey();
  }, [isAuthenticated]);

  // Carregar stats ao entrar na aba Soul
  useEffect(() => {
    if (currentPage === 'soul' && characterId) {
      characterService.getStats(characterId).then(setLifeStats);
    }
  }, [currentPage, characterId]);

  const checkApiKey = async () => {
    const selected = await ((window as any).aistudio as AIStudio).hasSelectedApiKey();
    setHasKey(selected);
    if (selected) initApp();
  };

  const handleOpenKeySelector = async () => {
    await ((window as any).aistudio as AIStudio).openSelectKey();
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
      // 1. Busca contexto
      const context = await characterService.getRecentContext(characterId);
      const recentThoughts = context?.thoughts || [];
      const currentSessionData = state.sessions.find(s => s.id === sid);
      const currentHistory = currentSessionData?.interactions || [];
      const isProactiveCall = mode === 'proactive';
      
      const aiResult = await processAILogic(userInput, state.soul, currentHistory, isProactiveCall, recentThoughts);

      // 3. Atualiza Dados Local e Remoto
      const updatedSessions = [...state.sessions];
      const sIdx = updatedSessions.findIndex(s => s.id === sid);
      
      if (sIdx !== -1) {
        if (userInput) {
          // Já adicionado localmente antes
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

  // --- Cronômetros ---
  useEffect(() => {
    if (!state.isAwake || !state.currentSessionId || !isAuthenticated) return;

    const thoughtTimer = setInterval(() => {
      if (!isProcessingRef.current) {
        processResponse(null, 'thought');
      }
    }, 30000);

    const proactiveTimer = setInterval(() => {
      if (!isProcessingRef.current) {
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
  }, [state.sessions, isAuthenticated, selectedSessionId, loading]);

  const handleTogglePower = async () => {
    if (!state.isAwake) {
      // 1. Ligar: Feedback IMEDIATO
      const newSid = crypto.randomUUID();
      const bootMessage: Message = { id: crypto.randomUUID(), role: 'ai', content: '⚡ [SISTEMA] Inicializando núcleos cognitivos...', timestamp: Date.now() };
      
      const newSession: Session = {
        id: newSid,
        date: new Date().toLocaleDateString(),
        startTime: Date.now(),
        interactions: [bootMessage], // Mensagem falsa instantânea
        thoughts: []
      };
      
      if (characterId) await characterService.toggleAwakeState(characterId, true);
      
      setSelectedSessionId(null);
      
      setState(prev => ({
        ...prev,
        isAwake: true,
        currentSessionId: newSid,
        sessions: [newSession, ...prev.sessions]
      }));
      
      // 2. Chama AI em background (não await)
      setLoading(true);
      processResponse(null, 'proactive'); // Fire and forget
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
    
    // Atualiza UI instantaneamente com mensagem do usuário
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

    if (state.currentSessionId) {
      setSelectedSessionId(state.currentSessionId);
    }
    
    setLoading(true);
    await processResponse(msg, 'interaction');
  };

  const handleUpdateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const success = updateSupabaseConfig(sbConfig.url, sbConfig.key);
    if (success) {
      alert("Configuração atualizada! O sistema tentará reconectar.");
      window.location.reload();
    } else {
      alert("Configuração inválida.");
    }
  };

  const displayedSessionId = selectedSessionId || state.currentSessionId || (state.sessions[0]?.id);
  const displayedSession = state.sessions.find(s => s.id === displayedSessionId);

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
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-gray-900/60 backdrop-blur-2xl z-50 shrink-0">
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
            <aside className="w-64 border-r border-white/5 bg-gray-900/20 flex flex-col p-2 space-y-2 overflow-y-auto shrink-0 hidden md:flex">
               <div className="p-4 text-[10px] font-black text-gray-600 uppercase">Sessões Temporais</div>
               {state.sessions.map(s => (
                 <button key={s.id} onClick={() => setSelectedSessionId(s.id)} className={`w-full text-left p-4 rounded-xl border transition-all ${displayedSessionId === s.id ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-transparent text-gray-500 hover:bg-white/5'}`}>
                   <div className="text-[10px] font-bold flex justify-between">
                      <span>{s.date}</span>
                      {s.id === state.currentSessionId && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>}
                   </div>
                   <div className="text-[9px] mono opacity-50 mt-1">{s.interactions.length} Msgs</div>
                 </button>
               ))}
            </aside>

            <section className="flex-1 flex flex-col relative bg-gray-950 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 md:p-12 space-y-4 relative z-10 custom-scrollbar">
                
                {/* Visualizador Principal Tamagotchi */}
                <div className="flex flex-col items-center">
                  <SoulStatus soul={state.soul} />
                  <SoulOrb soul={state.soul} isAwake={state.isAwake} />
                </div>

                <div className="max-w-3xl mx-auto space-y-4 pb-24">
                  {displayedSession?.interactions.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                      <div className={`max-w-[85%] p-4 md:p-5 rounded-[2rem] text-sm shadow-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-gray-900 border border-white/10 rounded-tl-none text-gray-300'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {loading && displayedSessionId === state.currentSessionId && <div className="text-center text-[10px] mono text-indigo-400 animate-pulse">PROCESSANDO...</div>}
                  <div ref={chatEndRef} />
                </div>
              </div>
              
              {state.isAwake && (
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent z-20">
                  <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2 md:gap-4 backdrop-blur-md bg-white/5 p-2 rounded-3xl border border-white/10 shadow-2xl">
                    <input 
                      autoFocus 
                      type="text" 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)} 
                      placeholder={displayedSessionId !== state.currentSessionId ? "Escrever volta para o presente..." : "Interagir..."}
                      className="flex-1 bg-transparent border-none px-4 md:px-6 py-3 text-sm focus:outline-none text-white placeholder:text-gray-500" 
                    />
                    <button type="submit" disabled={loading} className="px-6 md:px-8 bg-indigo-600 hover:bg-indigo-500 transition-colors rounded-2xl font-black text-[10px] uppercase text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]">Enviar</button>
                  </form>
                </div>
              )}
            </section>

            <aside className="w-80 border-l border-white/5 bg-gray-900/40 backdrop-blur-xl flex flex-col shrink-0 hidden lg:flex">
              <div className="p-4 border-b border-white/5 flex items-center gap-2">
                <BrainCircuit size={14} className="text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Fluxo de Pensamento</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {displayedSession?.thoughts.slice().reverse().map(t => (
                  <div key={t.id} className={`p-4 rounded-xl border text-[10px] mono leading-relaxed ${t.triggeredBy === 'time' ? 'bg-amber-500/5 border-amber-500/20 text-amber-200/60 italic' : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-200/60'}`}>
                    <div className="text-[8px] opacity-30 mb-1 flex justify-between">
                      <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                      <span>{t.triggeredBy === 'time' ? 'AUTO' : 'TRIGGER'}</span>
                    </div>
                    {t.content}
                  </div>
                ))}
              </div>
            </aside>
          </>
        )}

        {currentPage === 'soul' && (
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Emoções Atuais */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(state.soul).map(([k, v]) => typeof v === 'number' && (
                  <div key={k} className="bg-gray-900 p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
                    <div className="relative z-10">
                      <div className="text-[10px] font-black uppercase text-gray-500 mb-2">{k}</div>
                      <div className="text-3xl font-black text-white">{v}%</div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                      <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${v}%` }} />
                    </div>
                    <div className="absolute -right-4 -bottom-4 text-white/5 group-hover:text-indigo-500/10 transition-colors">
                      <Activity size={80} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Histórico de Wake Periods */}
                <div className="bg-gray-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><Power size={18}/></div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Ciclos de Vida (Wake Periods)</h3>
                  </div>
                  <div className="space-y-3">
                    {lifeStats.wakePeriods.map((wp: any) => (
                      <div key={wp.id} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-gray-400">INÍCIO</span>
                           <span className="text-xs font-mono text-green-400">{new Date(wp.started_at).toLocaleString()}</span>
                        </div>
                        <div className="h-8 w-px bg-white/10 mx-4" />
                        <div className="flex flex-col text-right">
                           <span className="text-[10px] font-bold text-gray-400">FIM</span>
                           <span className="text-xs font-mono text-red-400">{wp.ended_at ? new Date(wp.ended_at).toLocaleString() : 'ATIVO AGORA'}</span>
                        </div>
                      </div>
                    ))}
                    {lifeStats.wakePeriods.length === 0 && <div className="text-center py-4 text-gray-600 text-xs">Sem dados de ciclo vital.</div>}
                  </div>
                </div>

                {/* Histórico Emocional Recente */}
                <div className="bg-gray-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400"><Heart size={18}/></div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Registros Emocionais Recentes</h3>
                  </div>
                  <div className="space-y-2 overflow-hidden">
                    {lifeStats.emotionalHistory.map((em: any, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-lg transition-colors border-b border-white/5 last:border-0">
                         <div className="w-12 text-[9px] mono text-gray-500">{new Date(em.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                         <div className="flex-1 flex gap-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div className="bg-yellow-400 h-full" style={{width: `${em.happiness}%`}} title="Felicidade"/>
                            <div className="bg-blue-400 h-full" style={{width: `${em.sadness}%`}} title="Tristeza"/>
                            <div className="bg-purple-400 h-full" style={{width: `${em.fear}%`}} title="Medo"/>
                         </div>
                         <div className="text-[9px] font-bold text-gray-400 uppercase w-20 text-right truncate" title={em.trigger_event}>{em.trigger_event || 'Unknown'}</div>
                      </div>
                    ))}
                     {lifeStats.emotionalHistory.length === 0 && <div className="text-center py-4 text-gray-600 text-xs">Sem dados emocionais registrados.</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'system' && (
          <div className="flex-1 p-8 overflow-y-auto">
             <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Header System */}
                <div className="flex justify-between items-center border-b border-white/10 pb-6">
                   <div>
                     <h2 className="text-2xl font-black uppercase italic tracking-tighter">Painel do Sistema</h2>
                     <p className="text-[10px] text-gray-500 font-mono mt-1">PROTOCOL: SYS_ADMIN_V2</p>
                   </div>
                   <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest border border-red-500/20">
                      <LogOut size={14}/> Encerrar Sessão
                   </button>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Database Config */}
                    <div className="bg-gray-900 border border-white/5 p-6 rounded-3xl space-y-6">
                       <div className="flex items-center gap-3 text-indigo-400">
                          <Database size={20} />
                          <h3 className="text-sm font-bold uppercase tracking-widest">Configuração Neural (Supabase)</h3>
                       </div>
                       <form onSubmit={handleUpdateConfig} className="space-y-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-500 uppercase">Project URL</label>
                             <input type="text" value={sbConfig.url} onChange={e => setSbConfig({...sbConfig, url: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs mono text-gray-300 focus:border-indigo-500/50 focus:outline-none" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-500 uppercase">Anon Key</label>
                             <input type="password" value={sbConfig.key} onChange={e => setSbConfig({...sbConfig, key: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs mono text-gray-300 focus:border-indigo-500/50 focus:outline-none" />
                          </div>
                          <button type="submit" className="w-full py-3 bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/50 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Salvar Configuração</button>
                       </form>
                    </div>

                    {/* Data Management */}
                    <div className="bg-gray-900 border border-white/5 p-6 rounded-3xl space-y-6">
                       <div className="flex items-center gap-3 text-red-400">
                          <ShieldAlert size={20} />
                          <h3 className="text-sm font-bold uppercase tracking-widest">Zona de Perigo</h3>
                       </div>
                       <div className="space-y-4">
                          <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl space-y-2">
                             <h4 className="text-xs font-bold text-red-200">Reset Local</h4>
                             <p className="text-[10px] text-gray-500">Limpa o cache local do navegador. Não apaga dados do Supabase.</p>
                             <button onClick={() => { localStorage.removeItem('aura_v3_state'); window.location.reload(); }} className="px-4 py-2 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase w-full">Limpar Cache Local</button>
                          </div>
                       </div>
                    </div>
                </div>

                {/* System Logs */}
                <div className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col h-96">
                   <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-2">
                      <Terminal size={14} className="text-green-400"/>
                      <span className="text-[10px] font-mono text-gray-400">SYSTEM_OUTPUT_STREAM</span>
                   </div>
                   <div className="flex-1 p-4 overflow-y-auto space-y-2 font-mono text-[10px]">
                      {logs.length === 0 && <div className="text-gray-700 italic">No logs available.</div>}
                      {logs.map(l => (
                        <div key={l.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2">
                           <span className="text-gray-600">[{new Date(l.timestamp).toLocaleTimeString()}]</span>
                           <span className={`font-bold ${l.type === 'error' ? 'text-red-500' : l.type === 'warn' ? 'text-yellow-500' : l.type === 'success' ? 'text-green-500' : 'text-blue-500'}`}>[{l.context}]</span>
                           <span className="text-gray-300">{l.message}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
