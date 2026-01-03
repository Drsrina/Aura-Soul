
import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { useAuraEngine } from './hooks/useAuraEngine';
import { LoginPage, ApiKeyBlocker } from './components/Auth';
import { InteractionsView, SoulView, SystemView, EngramView } from './components/Views';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'interactions' | 'soul' | 'engram' | 'system'>('interactions');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');

  // Lógica Atômica
  const engine = useAuraEngine();

  // Handlers de View
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSessionId && selectedSessionId !== engine.state.currentSessionId) {
        // Se estiver vendo uma sessão antiga, volta para a atual ao enviar
        setSelectedSessionId(engine.state.currentSessionId);
    }
    engine.handleUserMessage(input);
    setInput('');
  };

  const handleUpdateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    engine.handleUpdateConfig(engine.sbConfig.url, engine.sbConfig.key);
  };

  const displayedSessionId = selectedSessionId || engine.state.currentSessionId || (engine.state.sessions[0]?.id);

  // Renderização Condicional de Auth
  if (!engine.isAuthenticated) {
    // Passa o handler de login que aceita username
    return <LoginPage onLogin={engine.setIsAuthenticated} />;
  }

  if (engine.hasKey === false) {
    return <ApiKeyBlocker onOpenKeySelector={engine.handleOpenKeySelector} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
      {/* Navegação Superior */}
      <nav className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-gray-900/60 backdrop-blur-2xl z-50 shrink-0">
        <div className="flex items-center gap-4">
          <Zap size={20} className={engine.state.isAwake ? 'text-indigo-400' : 'text-gray-600'} />
          <h1 className="text-xs font-black tracking-widest uppercase text-indigo-400">Aura v3.1</h1>
        </div>
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
          <button onClick={() => setCurrentPage('interactions')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest ${currentPage === 'interactions' ? 'bg-indigo-600' : 'text-gray-500'}`}>DIÁLOGO</button>
          <button onClick={() => { setCurrentPage('soul'); engine.fetchStats(); }} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest ${currentPage === 'soul' ? 'bg-indigo-600' : 'text-gray-500'}`}>ESSÊNCIA</button>
          <button onClick={() => setCurrentPage('engram')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest ${currentPage === 'engram' ? 'bg-indigo-600' : 'text-gray-500'}`}>ENGRAMA</button>
          <button onClick={() => setCurrentPage('system')} className={`px-6 py-2 rounded-xl text-[10px] font-black tracking-widest ${currentPage === 'system' ? 'bg-indigo-600' : 'text-gray-500'}`}>SISTEMA</button>
        </div>
        <button onClick={engine.handleTogglePower} className={`px-6 py-2 rounded-xl border-2 font-black text-[10px] tracking-widest ${engine.state.isAwake ? 'border-red-500 text-red-500' : 'border-green-500 text-green-500'}`}>
          {engine.state.isAwake ? 'DESLIGAR' : 'LIGAR'}
        </button>
      </nav>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex overflow-hidden">
        {currentPage === 'interactions' && (
          <InteractionsView 
            state={engine.state}
            displayedSessionId={displayedSessionId || null}
            loading={engine.loading}
            input={input}
            setInput={setInput}
            onSendMessage={handleSendMessage}
            onSelectSession={setSelectedSessionId}
          />
        )}

        {currentPage === 'soul' && (
          <SoulView soul={engine.state.soul} lifeStats={engine.lifeStats} />
        )}

        {currentPage === 'engram' && (
          <EngramView 
            nodes={engine.engramNodes} 
            onSearch={engine.handleEngramSearch}
            searching={engine.engramSearching}
            onLoadEngram={engine.fetchEngram}
            isLoading={engine.engramLoading}
          />
        )}

        {currentPage === 'system' && (
          <SystemView 
            sbConfig={engine.sbConfig}
            setSbConfig={engine.setSbConfig}
            onUpdateConfig={handleUpdateConfig}
            logs={engine.logs}
            onLogout={engine.handleLogout}
          />
        )}
      </main>
    </div>
  );
};

export default App;
