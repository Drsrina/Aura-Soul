
import React from 'react';
import { Smile, Frown, Ghost, Sparkles, Activity } from 'lucide-react';
import { SoulState } from '../types';

interface SoulOrbProps {
  soul: SoulState;
  isAwake: boolean;
}

/**
 * Representação Visual da Alma (Orbe).
 * Utiliza variáveis CSS para performance e separação de estilo.
 */
export const SoulOrb: React.FC<SoulOrbProps> = ({ soul, isAwake }) => {
  const hue = 220 + (soul.felicidade * 0.6) - (soul.tristeza * 0.5); 
  const pulseSpeed = Math.max(0.5, (soul.medo / 10)); 
  const scale = 0.8 + (soul.felicidade / 200) - (soul.solidão / 200); 
  
  const orbStyle = {
    background: `radial-gradient(circle, hsla(${hue}, 80%, 60%, 0.8) 0%, hsla(${hue + 40}, 70%, 40%, 0) 70%)`,
    boxShadow: `0 0 ${40 + soul.felicidade}px hsla(${hue}, 80%, 50%, 0.4)`,
    filter: `blur(${soul.confusão / 10}px)`,
    '--orb-scale': isAwake ? scale : 0.5,
    '--pulse-duration': `${2 / pulseSpeed}s`
  } as React.CSSProperties;

  return (
    <div className="relative flex items-center justify-center w-64 h-64 mx-auto my-4">
      <div 
        style={orbStyle} 
        className={`absolute w-48 h-48 rounded-full transition-all duration-1000 ease-in-out z-10 ${isAwake ? 'animate-orb-pulse' : ''}`} 
      />
      {isAwake && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <Sparkles className="text-white/20 animate-spin-slow" size={100} />
        </div>
      )}
    </div>
  );
};

/**
 * Barra de Status Emocional Rápido.
 */
export const SoulStatus: React.FC<{ soul: SoulState }> = ({ soul }) => {
  return (
    <div className="flex justify-center gap-4 mb-4">
      <StatusBadge icon={Smile} color="text-yellow-400" label="Felicidade" value={soul.felicidade} />
      <StatusBadge icon={Frown} color="text-blue-400" label="Tristeza" value={soul.tristeza} />
      <StatusBadge icon={Ghost} color="text-purple-400" label="Solidão" value={soul.solidão} />
    </div>
  );
};

const StatusBadge = ({ icon: Icon, color, label, value }: any) => (
  <div className="bg-gray-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
    <Icon size={14} className={color} />
    <div className="flex flex-col">
      <span className="text-[8px] uppercase tracking-wider text-gray-500 font-bold">{label}</span>
      <span className="text-xs font-mono font-bold text-white">{value}%</span>
    </div>
  </div>
);

export const EmotionCard: React.FC<{ label: string, value: number }> = ({ label, value }) => (
  <div className="bg-gray-900 p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
    <div className="relative z-10">
      <div className="text-[10px] font-black uppercase text-gray-500 mb-2">{label}</div>
      <div className="text-3xl font-black text-white">{value}%</div>
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
      <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${value}%` }} />
    </div>
    <div className="absolute -right-4 -bottom-4 text-white/5 group-hover:text-indigo-500/10 transition-colors">
      <Activity size={80} />
    </div>
  </div>
);
