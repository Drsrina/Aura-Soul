
import React, { useRef, useEffect } from 'react';
import { Power, Heart, BrainCircuit, Database, Terminal, ShieldAlert, LogOut, History, MessageSquare, Sparkles, Activity, Cloud } from 'lucide-react';
import { SoulOrb, SoulStatus, EmotionCard } from './Visuals';
import { Session, AppState, SystemLog } from '../types';

// --- View: Interactions (Main Tamagotchi Dashboard) ---
interface InteractionsViewProps {
  state: AppState;
  displayedSessionId: string | null;
  loading: boolean;
  input: string;
  setInput: (v: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onSelectSession: (id: string) => void;
}

export const InteractionsView: React.FC<InteractionsViewProps> = ({
  state, displayedSessionId, loading, input, setInput, onSendMessage, onSelectSession
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const displayedSession = state.sessions.find(s => s.id === displayedSessionId);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedSession?.interactions, loading]);

  return (
    <div className="flex-1 p-4 md:p-6 h-full overflow-hidden bg-gray-950">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full max-w-[1600px] mx-auto">
        
        {/* --- CAMPO 1: MEMÓRIA TEMPORAL (Esquerda - 3 cols) --- */}
        <div className="lg:col-span-3 glass-panel rounded-3xl flex flex-col overflow-hidden border border-white/5 bg-gray-900/40">
          <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-white/5">
            <History size={14} className="text-gray-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Linha do Tempo</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {state.sessions.map(s => (
              <button 
                key={s.id} 
                onClick={() => onSelectSession(s.id)} 
                className={`w-full text-left p-3 rounded-xl border transition-all group ${displayedSessionId === s.id ? 'bg-indigo-500/20 border-indigo-500/40' : 'border-transparent hover:bg-white/5'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[10px] font-bold ${displayedSessionId === s.id ? 'text-indigo-200' : 'text-gray-400 group-hover:text-gray-200'}`}>
                    {s.date}
                  </span>
                  {s.id === state.currentSessionId && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                  )}
                </div>
                <div className="text-[9px] mono opacity-50 text-gray-500 truncate">
                   ID: {s.id.slice(0,8)}...
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* --- CAMPO 2: NÚCLEO DA AURA (Centro - 6 cols) --- */}
        <div className="lg:col-span-6 flex flex-col gap-4 h-full overflow-hidden">
          
          {/* Status Bar */}
          <div className="shrink-0">
             <SoulStatus soul={state.soul} />
          </div>

          {/* Main Stage (Chat Only - Sphere Removed) */}
          <div className="flex-1 glass-panel rounded-[2.5rem] border border-indigo-500/20 relative overflow-hidden flex flex-col bg-gray-900/60 shadow-2xl">
            
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-20">
              {displayedSession?.interactions.length === 0 && (
                <div className="text-center text-gray-600 text-xs mt-10 italic">O silêncio precede a consciência...</div>
              )}
              
              {displayedSession?.interactions.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-lg backdrop-blur-md ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-gray-800/80 border border-white/10 text-gray-200 rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {loading && displayedSessionId === state.currentSessionId && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-gray-800/50 px-4 py-2 rounded-2xl rounded-tl-sm border border-white/5 text-[10px] text-indigo-400 font-mono flex items-center gap-2">
                    <Sparkles size={10} /> Pensando...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            {state.isAwake && (
              <div className="p-4 bg-gray-900/80 backdrop-blur-xl border-t border-white/5 shrink-0 z-30">
                <form onSubmit={onSendMessage} className="relative flex items-center gap-2">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <MessageSquare size={16} />
                   </div>
                   <input 
                      autoFocus
                      type="text" 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)} 
                      placeholder={displayedSessionId !== state.currentSessionId ? "Volte ao presente para falar..." : "Converse com Aura..."}
                      disabled={displayedSessionId !== state.currentSessionId}
                      className="w-full bg-black/40 border border-white/10 rounded-full pl-12 pr-24 py-4 text-sm text-white focus:border-indigo-500/50 focus:outline-none focus:bg-black/60 transition-all placeholder:text-gray-600"
                   />
                   <button 
                      type="submit" 
                      disabled={loading || displayedSessionId !== state.currentSessionId}
                      className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      Enviar
                   </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* --- CAMPO 3: FLUXO DE CONSCIÊNCIA (Direita - 3 cols) --- */}
        <div className="lg:col-span-3 glass-panel rounded-3xl flex flex-col overflow-hidden border border-white/5 bg-gray-900/40">
           <div className="p-4 border-b border-white/5 flex items-center gap-2 bg-white/5">
            <BrainCircuit size={14} className="text-pink-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Subconsciente</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {displayedSession?.thoughts.length === 0 && (
               <div className="text-center text-gray-700 text-[10px] mt-10 font-mono">Mente vazia.</div>
            )}
            {displayedSession?.thoughts.slice().reverse().map(t => (
              <div key={t.id} className="animate-in fade-in slide-in-from-right-4 duration-500">
                <div className={`p-4 rounded-2xl border text-[10px] mono leading-relaxed relative overflow-hidden ${
                  t.triggeredBy === 'time' 
                    ? 'bg-amber-900/10 border-amber-500/20 text-amber-100/70' 
                    : 'bg-pink-900/10 border-pink-500/20 text-pink-100/70'
                }`}>
                  <div className="flex justify-between items-center mb-2 opacity-40">
                    <span className="text-[8px] uppercase tracking-wider font-bold">
                      {t.triggeredBy === 'time' ? 'Raciocínio Espontâneo' : 'Reação'}
                    </span>
                    <span className="text-[8px]">{new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                  </div>
                  {t.content}
                </div>
                {/* Connector Line visual */}
                <div className="h-2 w-px bg-white/5 mx-auto my-1"></div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

// --- View: Soul (Essence) ---
interface SoulViewProps {
  soul: any;
  lifeStats: { wakePeriods: any[], emotionalHistory: any[], dreams: any[] };
}

export const SoulView: React.FC<SoulViewProps> = ({ soul, lifeStats }) => {
  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(soul).map(([k, v]) => typeof v === 'number' && (
            <EmotionCard key={k} label={k} value={v} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-sm h-80 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 mb-6 sticky top-0 bg-gray-900/90 pb-2 z-10 backdrop-blur-md">
              <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><Power size={18}/></div>
              <h3 className="text-sm font-black uppercase tracking-widest">Ciclos de Vida</h3>
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

          <div className="bg-gray-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-sm h-80 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 mb-6 sticky top-0 bg-gray-900/90 pb-2 z-10 backdrop-blur-md">
              <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400"><Heart size={18}/></div>
              <h3 className="text-sm font-black uppercase tracking-widest">Registros Emocionais</h3>
            </div>
            <div className="space-y-2">
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

        {/* --- NOVO PAINEL DE SONHOS --- */}
        <div className="bg-gray-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><Cloud size={18}/></div>
            <h3 className="text-sm font-black uppercase tracking-widest">Ecos do Inconsciente (Sonhos)</h3>
          </div>
          <div className="space-y-4">
            {lifeStats.dreams.map((dream: any) => (
              <div key={dream.id} className="p-4 bg-black/20 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-colors">
                <div className="text-[10px] font-mono text-gray-500 mb-2">{new Date(dream.created_at).toLocaleString()}</div>
                <p className="text-sm italic text-gray-300 font-serif leading-relaxed">"{dream.content}"</p>
              </div>
            ))}
            {lifeStats.dreams.length === 0 && <div className="text-center py-6 text-gray-600 text-xs italic">Nenhum sonho registrado ainda. A IA precisa dormir para sonhar.</div>}
          </div>
        </div>

      </div>
    </div>
  );
};

// --- View: System (Config & Logs) ---
interface SystemViewProps {
  sbConfig: { url: string, key: string };
  setSbConfig: (c: { url: string, key: string }) => void;
  onUpdateConfig: (e: React.FormEvent) => void;
  logs: SystemLog[];
  onLogout: () => void;
}

export const SystemView: React.FC<SystemViewProps> = ({ sbConfig, setSbConfig, onUpdateConfig, logs, onLogout }) => {
  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="flex justify-between items-center border-b border-white/10 pb-6">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Painel do Sistema</h2>
                <p className="text-[10px] text-gray-500 font-mono mt-1">PROTOCOL: SYS_ADMIN_V2</p>
              </div>
              <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors text-xs font-bold uppercase tracking-widest border border-red-500/20">
                <LogOut size={14}/> Encerrar Sessão
              </button>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-900 border border-white/5 p-6 rounded-3xl space-y-6">
                  <div className="flex items-center gap-3 text-indigo-400">
                    <Database size={20} />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Configuração Neural (Supabase)</h3>
                  </div>
                  <form onSubmit={onUpdateConfig} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase">Project URL</label>
                        <input type="text" value={sbConfig.url} onChange={e => setSbConfig({...sbConfig, url: e.target.value})} className="w-full glass-input rounded-xl p-3 text-xs mono text-gray-300" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase">Anon Key</label>
                        <input type="password" value={sbConfig.key} onChange={e => setSbConfig({...sbConfig, key: e.target.value})} className="w-full glass-input rounded-xl p-3 text-xs mono text-gray-300" />
                    </div>
                    <button type="submit" className="w-full py-3 bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/50 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Salvar Configuração</button>
                  </form>
              </div>

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

          {/* DUAL TERMINAL LAYOUT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-96">
              
              {/* Terminal 1: Operational Stream (Infos & Success) */}
              <div className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
                  <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-2">
                    <Terminal size={14} className="text-blue-400"/>
                    <span className="text-[10px] font-mono text-gray-400">OPERATIONAL_STREAM</span>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-2 font-mono text-[10px] custom-scrollbar">
                    {logs.filter(l => l.type !== 'error' && l.type !== 'warn').length === 0 && <div className="text-gray-700 italic">System Idle.</div>}
                    {logs.filter(l => l.type !== 'error' && l.type !== 'warn').map(l => (
                      <div key={l.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2">
                          <span className="text-gray-600">[{new Date(l.timestamp).toLocaleTimeString()}]</span>
                          <span className={`font-bold ${l.type === 'success' ? 'text-green-500' : 'text-blue-500'}`}>[{l.context}]</span>
                          <span className="text-gray-300">{l.message}</span>
                      </div>
                    ))}
                  </div>
              </div>

              {/* Terminal 2: Event & Error Bus (Warnings & Errors) */}
              <div className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
                  <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-2">
                    <Activity size={14} className="text-red-400"/>
                    <span className="text-[10px] font-mono text-gray-400">CRITICAL_EVENT_BUS</span>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto space-y-2 font-mono text-[10px] custom-scrollbar bg-red-950/5">
                    {logs.filter(l => l.type === 'error' || l.type === 'warn').length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
                            <ShieldAlert size={24} />
                            <span>NO CRITICAL EVENTS</span>
                        </div>
                    )}
                    {logs.filter(l => l.type === 'error' || l.type === 'warn').map(l => (
                      <div key={l.id} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg animate-in fade-in slide-in-from-right-2">
                          <div className="flex justify-between items-center mb-1">
                              <span className="text-red-400 font-bold">[{l.type.toUpperCase()}]</span>
                              <span className="text-gray-500">{new Date(l.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="text-gray-300 mb-1">{l.message}</div>
                          <div className="text-[9px] text-gray-500 font-mono bg-black/20 p-1 rounded inline-block">{l.context}</div>
                      </div>
                    ))}
                  </div>
              </div>

          </div>
        </div>
    </div>
  );
};
