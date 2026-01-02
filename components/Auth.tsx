
import React, { useState } from 'react';
import { User, Lock, ShieldCheck, AlertTriangle, Loader2, Zap } from 'lucide-react';

export const LoginPage: React.FC<{ onLogin: (username: string) => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAccessing, setIsAccessing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAccessing(true);
    setError('');

    setTimeout(() => {
      // Lógica de Autenticação Multi-User Simples
      const isValidAdmin = username === 'adm' && password === 'adm';
      const isValidUser = username === 'user' && password === 'user';

      if (isValidAdmin || isValidUser) {
        localStorage.setItem('aura_auth_token', 'session_active_' + Date.now());
        localStorage.setItem('aura_current_user', username); // Persiste quem logou
        onLogin(username);
      } else {
        setError('Acesso Negado: Credenciais inválidas.');
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
            <input required type="text" placeholder="IDENTIDADE (adm / user)" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full glass-input rounded-2xl pl-12 pr-6 py-4 text-xs font-bold tracking-widest text-white placeholder:text-gray-700 transition-all uppercase" />
          </div>
          <div className="relative group">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
            <input required type="password" placeholder="CÓDIGO DE ACESSO" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full glass-input rounded-2xl pl-12 pr-6 py-4 text-xs font-bold tracking-widest text-white placeholder:text-gray-700 transition-all" />
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

export const ApiKeyBlocker: React.FC<{ onOpenKeySelector: () => void }> = ({ onOpenKeySelector }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/90 p-8 text-center">
    <div className="max-w-md w-full bg-gray-900 border border-indigo-500/30 p-12 rounded-[3rem] space-y-8">
      <h2 className="text-2xl font-black text-white uppercase italic">Núcleo Bloqueado</h2>
      <button onClick={onOpenKeySelector} className="w-full bg-indigo-600 p-4 rounded-2xl text-xs uppercase font-black">Vincular Chave</button>
    </div>
  </div>
);
