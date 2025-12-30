
import React, { useRef, useEffect } from 'react';
import { Power, Heart, BrainCircuit, Database, Terminal, ShieldAlert, LogOut } from 'lucide-react';
import { SoulOrb, SoulStatus, EmotionCard } from './Visuals';
import { Session, AppState, SystemLog } from '../types';

// --- View: Interactions (Chat) ---
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedSession?.interactions, loading]);

  return (
    <>
      <aside className="w-64 border-r border-white/5 bg-gray-900/20 flex flex-col p-2 space-y-2 overflow-y-auto shrink-0 hidden md:flex custom-scrollbar">
        <div className="p-4 text-[10px] font-black text-gray-600 uppercase">Sessões Temporais</div>
        {state.sessions.map(s => (
          <button key={s.id} onClick={() => onSelectSession(s.id)} className={`w-full text-left p-4 rounded-xl border transition-all ${displayedSessionId === s.id ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-transparent text-gray-500 hover:bg-white/5'}`}>
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
            <form onSubmit={onSendMessage} className="max-w-3xl mx-auto flex gap-2 md:gap-4 backdrop-blur-md bg-white/5 p-2 rounded-3xl border border-white/10 shadow-2xl glass-panel">
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
  );
};

// --- View: Soul (Essence) ---
interface SoulViewProps {
  soul: any;
  lifeStats: { wakePeriods: any[], emotionalHistory: any[] };
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
          <div className="bg-gray-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
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

          <div className="bg-gray-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400"><Heart size={18}/></div>
              <h3 className="text-sm font-black uppercase tracking-widest">Registros Emocionais</h3>
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

          <div className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col h-96">
              <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-2">
                <Terminal size={14} className="text-green-400"/>
                <span className="text-[10px] font-mono text-gray-400">SYSTEM_OUTPUT_STREAM</span>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-2 font-mono text-[10px] custom-scrollbar">
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
  );
};
