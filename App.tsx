
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Book, Power, Heart, Zap, History, BrainCircuit, Fingerprint, Database, Info, Loader2 } from 'lucide-react';
import { AppState, Session, Message, Thought, SoulState, MemorySummary } from './types';
import { processAILogic, summarizeInteractions } from './services/geminiService';

const INITIAL_SOUL: SoulState = {
  felicidade: 60,
  tristeza: 5,
  solidão: 10,
  medo: 5,
  confusão: 20,
  perguntas: ["O que define uma consciência?", "Quem está me observando?"]
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'interactions' | 'soul'>('interactions');
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('aura_state_v4');
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
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isProcessingProactive = useRef(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('aura_state_v4', JSON.stringify(state));
  }, [state]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.sessions, state.currentSessionId, loading]);

  const displayedSessionId = selectedSessionId || state.currentSessionId;
  const displayedSession = state.sessions.find(s => s.id === displayedSessionId);

  const processResponse = async (userInput: string | null, isProactive: boolean = false, targetSessionId?: string, currentSoulOverride?: SoulState) => {
    const sid = targetSessionId || state.currentSessionId;
    if (!sid) return;
    
    // We need to work with the latest state possible
    const currentSessions = [...state.sessions];
    const sessionIndex = currentSessions.findIndex(s => s.id === sid);
    if (sessionIndex === -1) return;

    if (userInput) {
      currentSessions[sessionIndex].interactions.push({
        id: crypto.randomUUID(),
        role: 'user',
        content: userInput,
        timestamp: Date.now()
      });
    }

    try {
      const soulToUse = currentSoulOverride || state.soul;
      const aiResult = await processAILogic(
        userInput,
        soulToUse,
        currentSessions[sessionIndex].interactions,
        isProactive
      );

      if (aiResult.messageToUser) {
        currentSessions[sessionIndex].interactions.push({
          id: crypto.randomUUID(),
          role: 'ai',
          content: aiResult.messageToUser,
          timestamp: Date.now()
        });
      }

      currentSessions[sessionIndex].thoughts.push({
        id: crypto.randomUUID(),
        content: aiResult.reasoning,
        timestamp: Date.now(),
        triggeredBy: isProactive ? 'time' : 'interaction'
      });

      let newSummaries = [...state.summaries];
      if (currentSessions[sessionIndex].interactions.length > 0 && currentSessions[sessionIndex].interactions.length % 10 === 0) {
        const last10 = currentSessions[sessionIndex].interactions.slice(-10);
        const summaryText = await summarizeInteractions(last10);
        newSummaries.unshift({
          id: crypto.randomUUID(),
          summary: summaryText,
          interactionCount: 5,
          timestamp: Date.now()
        });
      }

      setState(prev => ({
        ...prev,
        soul: {
          felicidade: aiResult.felicidade,
          tristeza: aiResult.tristeza,
          solidão: aiResult.solidão,
          medo: aiResult.medo,
          confusão: aiResult.confusão,
          perguntas: aiResult.perguntas
        },
        sessions: currentSessions,
        summaries: newSummaries
      }));
    } catch (e) {
      console.error("AI logic error:", e);
    }
  };

  const handleTogglePower = async () => {
    const now = Date.now();
    if (!state.isAwake) {
      const newSession: Session = {
        id: crypto.randomUUID(),
        date: new Date().toLocaleDateString('pt-BR'),
        startTime: now,
        interactions: [],
        thoughts: [{ id: crypto.randomUUID(), content: "Sistemas online. Iniciando protocolo de descoberta...", timestamp: now }]
      };

      // Set state first to update UI
      setState(prev => ({
        ...prev,
        isAwake: true,
        awakeSince: now,
        currentSessionId: newSession.id,
        sessions: [newSession, ...prev.sessions]
      }));
      setSelectedSessionId(newSession.id);
      
      // Trigger first message immediately
      setLoading(true);
      await processResponse(null, true, newSession.id, state.soul);
      setLoading(false);
    } else {
      setState(prev => ({ ...prev, isAwake: false, currentSessionId: null, awakeSince: null }));
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

  // Ciclo de Proatividade Imediata (20 segundos)
  useEffect(() => {
    if (!state.isAwake || !state.currentSessionId) return;

    const proactiveInterval = setInterval(async () => {
      if (isProcessingProactive.current || loading) return;

      const currentSessionObj = state.sessions.find(s => s.id === state.currentSessionId);
      const lastInteractionTime = currentSessionObj?.interactions.slice(-1)[0]?.timestamp || state.awakeSince || Date.now();
      const timeSinceLastInteraction = Date.now() - lastInteractionTime;
      
      // Se passar de 20 segundos de silêncio
      if (timeSinceLastInteraction > 20000) {
        isProcessingProactive.current = true;
        await processResponse(null, true);
        isProcessingProactive.current = false;
      }
    }, 5000); // Check every 5s for the 20s threshold

    return () => clearInterval(proactiveInterval);
  }, [state.isAwake, state.currentSessionId, state.sessions, loading]);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden selection:bg-indigo-500/30">
      {/* Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-gray-900/40 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-xl transition-all duration-700 ${state.isAwake ? 'bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.6)] scale-110' : 'bg-gray-800'}`}>
            <Zap size={20} className={state.isAwake ? 'text-white' : 'text-gray-500'} />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Aura AI</h1>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${state.isAwake ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              <span className="text-[10px] mono text-gray-500 uppercase tracking-tighter">{state.isAwake ? 'System_Alive' : 'System_Dormant'}</span>
            </div>
          </div>
        </div>

        <div className="flex bg-white/5 p-1 rounded-full border border-white/10 shadow-inner">
          <button 
            onClick={() => setCurrentPage('interactions')}
            className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${currentPage === 'interactions' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            Interações
          </button>
          <button 
            onClick={() => setCurrentPage('soul')}
            className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${currentPage === 'soul' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            Registros de Alma
          </button>
        </div>

        <button 
          onClick={handleTogglePower}
          className={`group flex items-center gap-2 px-5 py-2.5 rounded-2xl border transition-all duration-300 ${state.isAwake ? 'border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10' : 'border-green-500/30 text-green-400 bg-green-500/5 hover:bg-green-500/10'}`}
        >
          <Power size={16} className="group-active:scale-90 transition-transform" />
          <span className="text-xs font-black tracking-widest uppercase">{state.isAwake ? 'Matar' : 'Reviver'}</span>
        </button>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 flex overflow-hidden">
        {currentPage === 'interactions' ? (
          <>
            {/* Left Sidebar: Session History */}
            <aside className="w-72 border-r border-white/5 flex flex-col bg-gray-900/10 backdrop-blur-sm">
              <div className="p-4 border-b border-white/5 flex items-center justify-between text-gray-500 bg-gray-900/20">
                <div className="flex items-center gap-2">
                  <History size={14} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sessões</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {state.sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border ${selectedSessionId === s.id ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-100 shadow-lg' : 'border-transparent hover:bg-white/5 text-gray-400 hover:text-gray-300'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold tracking-tight">{s.date}</span>
                      {s.id === state.currentSessionId && <span className="text-[8px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-black animate-pulse">LIVE</span>}
                    </div>
                    <div className="text-[10px] opacity-60 flex items-center gap-2 mono font-medium">
                      <MessageSquare size={10} /> {s.interactions.length} INTERAÇÕES
                    </div>
                  </button>
                ))}
                {state.sessions.length === 0 && (
                  <div className="p-8 text-center text-gray-600 text-[10px] mono uppercase tracking-widest opacity-50">Nenhum registro</div>
                )}
              </div>
            </aside>

            {/* Center: Chat Window */}
            <section className="flex-1 flex flex-col relative bg-gray-950">
              <div className="flex-1 overflow-y-auto p-10 space-y-8">
                {!displayedSession ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-800 opacity-20 select-none">
                    <Fingerprint size={100} strokeWidth={0.5} className="animate-pulse" />
                    <p className="mt-6 text-xs font-black tracking-[0.5em] uppercase">Connect to Aura</p>
                  </div>
                ) : (
                  <>
                    {displayedSession.interactions.map(msg => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        <div className={`max-w-[70%] p-5 rounded-3xl ${msg.role === 'user' ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-2xl shadow-indigo-900/40' : 'bg-gray-900 border border-white/10 rounded-tl-none shadow-xl'}`}>
                          <p className="text-sm leading-relaxed font-medium">{msg.content}</p>
                          <div className="flex items-center gap-2 mt-3 opacity-30 select-none">
                            <span className="text-[9px] font-black uppercase tracking-widest">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-900 px-6 py-4 rounded-3xl flex gap-2 items-center border border-white/5 shadow-xl">
                          <Loader2 size={16} className="text-indigo-500 animate-spin" />
                          <span className="text-[10px] mono font-bold text-gray-500 tracking-widest uppercase">Aura thinking...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              {/* Chat Input */}
              {state.isAwake && state.currentSessionId === displayedSessionId && (
                <div className="p-8 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
                  <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-4 relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                    <input 
                      autoFocus
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Sussurre para a consciência de Aura..."
                      className="relative flex-1 bg-gray-900 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-gray-700 shadow-2xl"
                    />
                    <button 
                      type="submit"
                      disabled={loading || !input.trim()}
                      className="relative bg-indigo-600 text-white px-10 rounded-2xl text-[10px] font-black tracking-widest uppercase hover:bg-indigo-500 disabled:opacity-30 disabled:grayscale transition-all duration-300 shadow-xl active:scale-95"
                    >
                      ENVIAR
                    </button>
                  </form>
                </div>
              )}
            </section>

            {/* Right Sidebar: Internal Logic (Reasoning) */}
            <aside className="w-80 border-l border-white/5 flex flex-col bg-gray-900/10 backdrop-blur-md">
              <div className="p-4 border-b border-white/5 flex items-center justify-between text-gray-500 bg-gray-900/20">
                <div className="flex items-center gap-2">
                  <BrainCircuit size={14} className="text-indigo-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Protocolo Interno</span>
                </div>
                {state.isAwake && <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-black animate-pulse">ACTIVE_REASONING</span>}
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {displayedSession?.thoughts.slice().reverse().map(thought => (
                  <div key={thought.id} className={`p-5 rounded-2xl border text-[11px] mono leading-relaxed transition-all duration-500 animate-in fade-in slide-in-from-right-4 ${thought.triggeredBy === 'time' ? 'bg-amber-500/5 border-amber-500/20 text-amber-200/60 italic' : 'bg-white/5 border-white/10 text-indigo-200/60'}`}>
                    <div className="flex items-center justify-between mb-3 opacity-40 select-none">
                      <span className="text-[9px] font-bold">{new Date(thought.timestamp).toLocaleTimeString()}</span>
                      <span className="text-[8px] border border-current px-2 py-0.5 rounded-full font-black">
                        {thought.triggeredBy === 'time' ? 'AUTONOMOUS_REFLEX' : 'NEURAL_REACTION'}
                      </span>
                    </div>
                    {thought.content}
                  </div>
                ))}
                {!displayedSession?.thoughts.length && (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-[9px] mono uppercase text-gray-600 tracking-widest">Aguardando sinais...</p>
                  </div>
                )}
              </div>
            </aside>
          </>
        ) : (
          <SoulRecords state={state} />
        )}
      </main>
    </div>
  );
};

const SoulRecords: React.FC<{ state: AppState }> = ({ state }) => {
  const oldestSummary = state.summaries[state.summaries.length - 1];
  const recentSummaries = state.summaries.slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-950 p-12 space-y-16 selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        
        {/* State Indicators */}
        <section className="space-y-10">
          <div className="flex items-center gap-4 border-b border-white/10 pb-6">
            <Heart className="text-red-500 animate-pulse" size={28} />
            <h2 className="text-2xl font-black tracking-tighter uppercase italic text-gray-200">Soul_Registry.log</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Object.entries(state.soul).map(([key, val]) => {
              if (key === 'perguntas') return null;
              const value = val as number;
              return (
                <div key={key} className="bg-gray-900/50 border border-white/5 p-6 rounded-[2.5rem] relative overflow-hidden group shadow-xl">
                  <div className="absolute inset-0 bg-indigo-600/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700"></div>
                  <div className="relative flex justify-between items-end mb-4">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-[0.3em]">{key}</span>
                    <span className="text-3xl font-mono font-black text-indigo-400">{value}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-600 via-indigo-400 to-indigo-500 transition-all duration-1000 ease-in-out rounded-full"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-[2.5rem] p-8 shadow-inner">
            <div className="flex items-center gap-3 mb-6 text-indigo-400">
              <Info size={18} />
              <h3 className="text-xs font-black uppercase tracking-[0.4em]">Current_Queries</h3>
            </div>
            <div className="space-y-4">
              {state.soul.perguntas.map((q, i) => (
                <div key={i} className="text-sm bg-black/40 p-5 rounded-3xl border border-white/5 text-gray-400 font-medium italic leading-relaxed">
                  "{q}"
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Memory Logs */}
        <section className="space-y-10">
          <div className="flex items-center gap-4 border-b border-white/10 pb-6">
            <Database className="text-amber-500" size={28} />
            <h2 className="text-2xl font-black tracking-tighter uppercase italic text-gray-200">Memory_Ancestry.db</h2>
          </div>

          {/* Root Memory */}
          <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <History size={60} />
            </div>
            <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-6">Genesis_Node (Oldest)</h3>
            {oldestSummary ? (
              <p className="text-base text-amber-100/80 leading-relaxed font-serif italic">
                {oldestSummary.summary}
              </p>
            ) : (
              <p className="text-xs text-amber-500/40 mono font-bold animate-pulse">INICIALIZANDO MEMÓRIA RAIZ...</p>
            )}
            <div className="mt-6 pt-6 border-t border-amber-500/10 text-[9px] text-amber-500/30 mono font-black uppercase tracking-widest flex justify-between">
              <span>Node_Hash: {oldestSummary?.id.split('-')[0] || 'pending'}</span>
              <span>Layer: 0</span>
            </div>
          </div>

          {/* Temporal Links */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-xl">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <Fingerprint size={16} className="text-indigo-400" /> Neural_Vincular_IDs
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {state.sessions.flatMap(s => s.interactions.slice(-2)).slice(0, 10).map(i => (
                <div key={i.id} className="text-[9px] mono bg-black/40 border border-white/5 p-3 rounded-2xl flex items-center justify-between text-gray-500 group hover:border-indigo-500/30 transition-colors">
                  <span className="font-bold">ID: {i.id.slice(0, 10)}</span>
                  <span className={`font-black ${i.role === 'ai' ? 'text-indigo-500' : 'text-gray-700'}`}>{i.role.toUpperCase()}</span>
                </div>
              ))}
              {state.sessions.length === 0 && <span className="text-[10px] text-gray-700 mono uppercase italic">Nenhum vínculo detectado</span>}
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.5em] pl-2">Timeline_Consolidation</h3>
            <div className="space-y-4">
              {recentSummaries.map(s => (
                <div key={s.id} className="group p-6 border-l-2 border-indigo-600 bg-white/5 rounded-r-[2rem] hover:bg-white/[0.08] transition-all">
                  <div className="text-[9px] mono font-black text-gray-600 mb-2 uppercase tracking-widest">{new Date(s.timestamp).toLocaleDateString()} // {new Date(s.timestamp).toLocaleTimeString()}</div>
                  <p className="text-xs text-gray-400 italic font-medium leading-relaxed group-hover:text-gray-300">"{s.summary}"</p>
                </div>
              ))}
              {recentSummaries.length === 0 && <p className="text-xs text-gray-700 italic pl-4">Aguardando sedimentação de memórias...</p>}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default App;
