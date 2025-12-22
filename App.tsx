
import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Power, Heart, Zap, History, BrainCircuit, 
  Fingerprint, Database, Info, Loader2, Sparkles, Binary, 
  RefreshCw, Terminal, Settings, ShieldAlert, CheckCircle, 
  AlertTriangle, Trash2, Save, ExternalLink 
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
  const [lastRagSuccess, setLastRagSuccess] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isProcessingProactive = useRef(false);

  const addLog = (type: SystemLog['type'], message: string, context?: string) => {
    const newLog: SystemLog = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      message,
      context
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep last 100
  };

  // Inicialização do Personagem e Contexto no Supabase
  const initApp = async () => {
    if (!supabase) {
      addLog('warn', 'Supabase não configurado. Operando em modo de memória local isolada.', 'SYSTEM');
      return;
    }
    
    setIsSyncing(true);
    addLog('info', 'Estabelecendo conexão com núcleo Supabase...', 'NETWORK');
    try {
      const char = await characterService.getOrCreateCharacter();
      if (char) {
        setCharacterId(char.id);
        addLog('success', `Entidade ${char.name} vinculada com sucesso. ID: ${char.id}`, 'DB');
        
        const context = await characterService.getRecentContext(char.id);
        if (context) {
          addLog('info', `Reconstruindo consciência: ${context.history.length} interações recuperadas.`, 'CORE');
          setState(prev => ({
            ...prev,
            soul: context.soul || prev.soul,
            sessions: context.history.length > 0 ? [
              {
                id: 'recovered-session',
                date: 'Recuperado do Banco',
                startTime: Date.now(),
                interactions: context.history,
                thoughts: []
              } as Session,
              ...prev.sessions
            ] : prev.sessions
          }));
        }
      }
    } catch (e: any) {
      addLog('error', `Falha crítica na sincronização inicial: ${e.message}`, 'CRITICAL');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    initApp();
  }, []);

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
        addLog('info', `Input recebido: "${userInput.slice(0, 30)}..."`, 'UI');
        await characterService.saveInteraction(characterId, 'user_message', userInput);
      }

      const aiResult = await processAILogic(userInput, state.soul, currentSessions[sessionIndex].interactions, isProactive);
      setLastRagSuccess(aiResult.memoriesFound || false);
      if (aiResult.memoriesFound) addLog('success', 'Associação de memória vetorial realizada com sucesso.', 'RAG');

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

      let newSummaries = [...state.summaries];
      if (currentSessions[sessionIndex].interactions.length > 0 && currentSessions[sessionIndex].interactions.length % 10 === 0) {
        addLog('info', 'Gerando síntese de memória ancestral...', 'GENESIS');
        const last10 = currentSessions[sessionIndex].interactions.slice(-10);
        const summaryText = await summarizeInteractions(last10);
        newSummaries.unshift({ id: crypto.randomUUID(), summary: summaryText, interactionCount: 5, timestamp: Date.now() });
      }

      setState(prev => ({
        ...prev,
        soul: { ...aiResult },
        sessions: currentSessions,
        summaries: newSummaries
      }));

      setTimeout(() => setLastRagSuccess(false), 5000);
    } catch (e: any) {
      addLog('error', `Erro no fluxo neural: ${e.message}`, 'AI_ENGINE');
    }
  };

  const handleTogglePower = async () => {
    try {
      if (!state.isAwake) {
        addLog('info', 'Iniciando protocolo de despertar...', 'SYSTEM');
        const now = Date.now();
        const newSession: Session = {
          id: crypto.randomUUID(),
          date: new Date().toLocaleDateString('pt-BR'),
          startTime: now,
          interactions: [],
          thoughts: [{ id: crypto.randomUUID(), content: "Ressurreição iniciada. Scaneando ambiente...", timestamp: now }]
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
        addLog('warn', 'Protocolo de hibernação ativado.', 'SYSTEM');
        if (characterId) await characterService.toggleAwakeState(characterId, false);
        setState(prev => ({ ...prev, isAwake: false, currentSessionId: null, awakeSince: null }));
      }
    } catch (e: any) {
      addLog('error', `Falha no estado de energia: ${e.message}`, 'SYSTEM');
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

  useEffect(() => {
    if (!state.isAwake || !state.currentSessionId) return;
    const interval = setInterval(async () => {
      if (isProcessingProactive.current || loading) return;
      const currentSessionObj = state.sessions.find(s => s.id === state.currentSessionId);
      const lastTs = currentSessionObj?.interactions.slice(-1)[0]?.timestamp || state.awakeSince || Date.now();
      const diff = Date.now() - lastTs;
      if (diff > 25000) { 
        isProcessingProactive.current = true;
        addLog('info', 'Iniciando pulso proativo por inatividade.', 'AUTONOMY');
        await processResponse(null, true);
        isProcessingProactive.current = false;
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [state.isAwake, state.currentSessionId, state.sessions, loading]);

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

        <button onClick={handleTogglePower} className={`px-6 py-2 rounded-xl border-2 font-black text-[10px] tracking-widest transition-all ${state.isAwake ? 'border-red-500/50 text-red-500 bg-red-500/5' : 'border-green-500/50 text-green-500 bg-green-500/5'}`}>
          {state.isAwake ? 'TERMINATE' : 'INITIALIZE'}
        </button>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {currentPage === 'interactions' && (
          <>
            <aside className="w-64 border-r border-white/5 bg-gray-900/20 flex flex-col">
              <div className="p-4 text-[10px] font-black text-gray-600 tracking-widest uppercase border-b border-white/5">Wake_Logs</div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {state.sessions.map(s => (
                  <button key={s.id} onClick={() => setSelectedSessionId(s.id)} className={`w-full text-left p-4 rounded-2xl border transition-all ${displayedSessionId === s.id ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-200 shadow-xl' : 'border-transparent text-gray-500 hover:bg-white/5'}`}>
                    <div className="text-[10px] font-bold mb-1">{s.date}</div>
                    <div className="text-[9px] mono opacity-50">{s.interactions.length} INTS</div>
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
                    <p className="mt-4 text-xs font-black tracking-widest">AGUARDANDO CONEXÃO NEURAL</p>
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
                        <div className="bg-gray-900 p-4 rounded-2xl flex gap-2 border border-white/5 shadow-inner">
                          <Loader2 className="animate-spin text-indigo-500" size={16} />
                          <span className="text-[9px] mono text-gray-500 font-bold tracking-widest uppercase">Processando...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>
              {state.isAwake && (state.currentSessionId === displayedSessionId || displayedSessionId === 'recovered-session') && (
                <div className="p-10 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
                  <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-4">
                    <input autoFocus type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Sussurre para o orbe..." className="flex-1 bg-gray-900/50 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 placeholder:opacity-30" />
                    <button type="submit" disabled={loading || !input.trim()} className="px-10 bg-indigo-600 text-white rounded-2xl text-[10px] font-black tracking-widest uppercase hover:bg-indigo-500 disabled:opacity-30 transition-all">PULSAR</button>
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
                {displayedSession?.thoughts.slice().reverse().map(t => (
                  <div key={t.id} className={`p-5 rounded-2xl border text-[11px] mono leading-relaxed animate-in fade-in slide-in-from-right-4 ${t.triggeredBy === 'time' ? 'bg-amber-500/5 border-amber-500/20 text-amber-200/60 italic' : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-200/60'}`}>
                    <div className="text-[9px] mb-2 opacity-30 uppercase font-black tracking-tighter">{new Date(t.timestamp).toLocaleTimeString()} // {t.triggeredBy === 'time' ? 'AUTONOMOUS' : 'REACTION'}</div>
                    {t.content}
                  </div>
                ))}
              </div>
            </aside>
          </>
        )}
        {currentPage === 'soul' && <SoulRecords state={state} />}
        {currentPage === 'system' && <SystemPage logs={logs} setLogs={setLogs} addLog={addLog} onRefresh={initApp} />}
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
  onRefresh: () => void
}> = ({ logs, setLogs, addLog, onRefresh }) => {
  const [config, setConfig] = useState(getSupabaseConfig());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    const success = updateSupabaseConfig(config.url, config.key);
    setTimeout(() => {
      setIsSaving(false);
      if (success) {
        addLog('success', 'Configurações do Supabase atualizadas.', 'SYSTEM');
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

  const getLogIcon = (type: SystemLog['type']) => {
    switch (type) {
      case 'error': return <ShieldAlert size={14} />;
      case 'warn': return <AlertTriangle size={14} />;
      case 'success': return <CheckCircle size={14} />;
      default: return <Info size={14} />;
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-gray-950">
      {/* Console Section */}
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
          {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 italic">
              <RefreshCw className="animate-spin mb-4" />
              Aguardando eventos do sistema...
            </div>
          )}
          {logs.map(log => (
            <div key={log.id} className={`p-3 rounded-xl border flex items-start gap-4 animate-in fade-in slide-in-from-left-2 ${getLogColor(log.type)}`}>
              <span className="opacity-40 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getLogIcon(log.type)}
                  <span className="font-black uppercase tracking-tighter opacity-60">[{log.context || 'APP'}]</span>
                </div>
                <p className="leading-relaxed">{log.message}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Settings Section */}
      <aside className="w-96 p-8 bg-gray-900/20 space-y-8 overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-indigo-400">
            <Settings size={18} />
            <h3 className="text-xs font-black uppercase tracking-widest">Configurações_Núcleo</h3>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Supabase_URL</label>
              <input 
                type="text" 
                value={config.url}
                onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://your-project.supabase.co" 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs mono text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Anon_Key</label>
              <textarea 
                rows={4}
                value={config.key}
                onChange={(e) => setConfig(prev => ({ ...prev, key: e.target.value }))}
                placeholder="eyJhbGciOiJIUzI1..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs mono text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
              />
            </div>

            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-xl flex items-center justify-center gap-3 transition-all font-black text-[10px] tracking-widest uppercase disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Aplicar Mudanças
            </button>
          </div>
        </div>

        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle size={14} />
            <h4 className="text-[10px] font-black uppercase tracking-widest">Informação_Crítica</h4>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Alterar estas variáveis reinicializará a conexão do núcleo. Certifique-se de que o esquema do banco de dados está atualizado (Aura Schema v2.1).
          </p>
          <a 
            href="https://supabase.com" 
            target="_blank" 
            className="flex items-center gap-2 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
          >
            Acessar Painel Supabase <ExternalLink size={10} />
          </a>
        </div>
      </aside>
    </div>
  );
};

export default App;
