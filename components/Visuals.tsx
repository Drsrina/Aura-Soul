import React, { useRef, useEffect, useState } from 'react';
import { Smile, Frown, Ghost, Activity } from 'lucide-react';
import { SoulState, EngramNode } from '../types';

interface SoulOrbProps {
  soul: SoulState;
  isAwake: boolean;
}

/**
 * Representação Visual da Alma (Orbe 3D Cintilante).
 */
export const SoulOrb: React.FC<SoulOrbProps> = ({ soul, isAwake }) => {
  // --- LÓGICA DE COR (Mantida) ---
  const totalWeight = Math.max(1, soul.felicidade + soul.tristeza + soul.medo + soul.solidão);
  const weightedHue = (
    (soul.felicidade * 45) + 
    (soul.tristeza * 230) + 
    (soul.medo * 275) + 
    (soul.solidão * 180)
  ) / totalWeight;

  const finalHue = totalWeight < 20 ? 220 : weightedHue;
  
  // Ajuste de brilho para a esfera 3D
  // Base mais escura para dar contraste com o "specular highlight"
  const saturation = Math.min(100, Math.max(40, 60 + (soul.felicidade / 3) + (soul.medo / 3) - (soul.confusão / 1.5)));
  const lightness = Math.min(60, Math.max(30, 45 + (soul.felicidade / 5))); // Um pouco mais escuro para o efeito 3D funcionar

  // Batimento
  const pulseSpeed = Math.max(0.5, (soul.medo / 10) + (soul.felicidade / 20)); 
  const scale = 0.8 + (soul.felicidade / 200) - (soul.solidão / 200); 

  // --- EFEITOS 3D CSS ---
  const sphereStyle = {
    // Gradiente Radial Deslocado (Luz vindo do canto superior esquerdo 30% 30%)
    background: `radial-gradient(circle at 35% 35%, 
        hsla(${finalHue}, ${saturation}%, 95%, 1) 0%, 
        hsla(${finalHue}, ${saturation}%, ${lightness + 10}%, 1) 20%, 
        hsla(${finalHue}, ${saturation}%, ${lightness}%, 1) 50%, 
        hsla(${finalHue}, ${saturation}%, ${lightness - 20}%, 1) 90%
    )`,
    // Sombras para dar profundidade e glow externo
    boxShadow: `
        inset -10px -10px 20px hsla(${finalHue}, ${saturation}%, 10%, 0.5), 
        inset 10px 10px 20px hsla(${finalHue}, 100%, 90%, 0.4),
        0 0 ${30 + soul.felicidade}px hsla(${finalHue}, ${saturation}%, 50%, 0.6)
    `,
    transition: 'all 1.5s ease-in-out',
    '--orb-scale': isAwake ? scale : 0.4,
    '--pulse-duration': `${3 / pulseSpeed}s`,
    '--shimmer-color': `hsla(${finalHue}, 100%, 90%, 0.3)`
  } as React.CSSProperties;

  return (
    <div className="relative flex items-center justify-center w-full h-full min-h-[200px]">
      {/* Container da Esfera */}
      <div 
        style={sphereStyle} 
        className={`relative w-32 h-32 md:w-48 md:h-48 rounded-full z-10 overflow-hidden ${isAwake ? 'animate-orb-pulse' : 'grayscale opacity-30 blur-sm'}`} 
      >
        {/* Camada de Cintilância (Efeito Líquido/Energia) */}
        {isAwake && (
            <div className="absolute inset-0 w-[200%] h-[200%] top-[-50%] left-[-50%] animate-liquid-shimmer opacity-60 mix-blend-overlay"
                 style={{
                     background: `conic-gradient(from 0deg, transparent 0deg, var(--shimmer-color) 60deg, transparent 120deg)`
                 }}
            />
        )}
        
        {/* Specular Highlight Extra (Brilho intenso fixo) */}
        {isAwake && (
            <div className="absolute top-[15%] left-[15%] w-[20%] h-[15%] bg-white rounded-[50%] blur-md opacity-70 pointer-events-none" />
        )}
      </div>
    </div>
  );
};

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

// --- VISUALIZADOR DE ENGRAMA (CANVAS 3D SIMULADO) ---
export const EngramGalaxy: React.FC<{ nodes: EngramNode[] }> = ({ nodes }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<{node: EngramNode, x: number, y: number} | null>(null);
  // Estado para forçar re-render do tooltip
  const [tooltip, setTooltip] = useState<{content: string, type: string, x: number, y: number} | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Prepara os nós com posições 3D aleatórias (mas determinísticas se tivéssemos seed)
    // Como não temos PCA no frontend, usamos posições aleatórias para visualização
    // Mas conectaremos baseados na similaridade real do vetor
    const processedNodes = nodes.map(n => ({
        ...n,
        // Espalhamos em uma esfera 3D
        x: (Math.random() - 0.5) * 800,
        y: (Math.random() - 0.5) * 800,
        z: (Math.random() - 0.5) * 800,
        // Cor baseada no tipo
        color: n.group_type === 'memory' ? '#4f46e5' : // Indigo (Memória)
               n.group_type === 'dream' ? '#d946ef' :  // Fuchsia (Sonho)
               n.group_type === 'thought' ? '#f59e0b' : // Amber (Pensamento)
               '#10b981' // Emerald (Interação)
    }));

    // Função auxiliar para produto escalar (similaridade)
    const dotProduct = (a: number[], b: number[]) => {
        let dot = 0;
        for(let i=0; i < Math.min(a.length, b.length); i++) dot += a[i] * b[i];
        return dot; // Assumindo vetores normalizados pelo Gemini
    };

    let rotationX = 0;
    let rotationY = 0;
    let animationFrame: number;

    const render = () => {
        if (!canvas || !ctx) return;
        
        // Ajusta tamanho
        canvas.width = canvas.parentElement?.clientWidth || 800;
        canvas.height = canvas.parentElement?.clientHeight || 600;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.fillStyle = '#030712'; // gray-950
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        rotationY += 0.002; // Rotação automática

        // Projeção 3D para 2D
        const projectedNodes = processedNodes.map(node => {
            // Rotação Y
            let x = node.x * Math.cos(rotationY) - node.z * Math.sin(rotationY);
            let z = node.z * Math.cos(rotationY) + node.x * Math.sin(rotationY);
            
            // Perspectiva
            const scale = 600 / (600 + z);
            const x2d = x * scale + cx;
            const y2d = node.y * scale + cy;

            return { ...node, x2d, y2d, scale, z };
        });

        // Ordena por Z para desenhar os de trás primeiro
        projectedNodes.sort((a, b) => b.z - a.z);

        // Desenha Conexões (Linhas) se forem similares
        // Para performance, verificamos apenas vizinhos próximos na lista ou aleatórios
        // Em um app real usaríamos um índice espacial
        ctx.lineWidth = 0.5;
        for (let i = 0; i < projectedNodes.length; i++) {
            const nodeA = projectedNodes[i];
            // Tenta conectar com os próximos 5 nós da lista para simular cluster
            // Se o embedding for muito similar (> 0.75), desenha linha forte
            for (let j = i + 1; j < Math.min(i + 10, projectedNodes.length); j++) {
                const nodeB = projectedNodes[j];
                const similarity = dotProduct(nodeA.embedding, nodeB.embedding);
                
                if (similarity > 0.65) {
                    const alpha = (similarity - 0.65) * 2; // Normaliza opacidade
                    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
                    ctx.beginPath();
                    ctx.moveTo(nodeA.x2d, nodeA.y2d);
                    ctx.lineTo(nodeB.x2d, nodeB.y2d);
                    ctx.stroke();
                }
            }
        }

        // Desenha Nós
        projectedNodes.forEach(node => {
            const size = 3 * node.scale;
            ctx.beginPath();
            ctx.arc(node.x2d, node.y2d, size, 0, Math.PI * 2);
            ctx.fillStyle = node.color;
            ctx.fill();
            
            // Glow
            ctx.shadowBlur = 10 * node.scale;
            ctx.shadowColor = node.color;
        });
        ctx.shadowBlur = 0;

        animationFrame = requestAnimationFrame(render);
    };

    render();

    // Mouse Interaction Handler Simples
    const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // Encontrar nó próximo do mouse (no frame atual de rotação seria complexo, 
        // vamos simplificar parando a rotação ou apenas detectando colisão aproximada)
        // Por simplicidade neste exemplo, não implementaremos colisão exata no 3D giratório.
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
        cancelAnimationFrame(animationFrame);
        canvas.removeEventListener('mousemove', handleMouseMove);
    };

  }, [nodes]);

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/5 bg-gray-950">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* Legenda */}
      <div className="absolute bottom-4 left-4 p-4 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 pointer-events-none">
         <div className="text-[10px] font-black uppercase text-gray-500 mb-2">Legenda Neural</div>
         <div className="space-y-1">
            <div className="flex items-center gap-2 text-[9px] text-gray-300"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Memória (Fatos)</div>
            <div className="flex items-center gap-2 text-[9px] text-gray-300"><span className="w-2 h-2 rounded-full bg-fuchsia-500"></span> Sonhos (Abstrato)</div>
            <div className="flex items-center gap-2 text-[9px] text-gray-300"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pensamentos (Lógica)</div>
            <div className="flex items-center gap-2 text-[9px] text-gray-300"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Conversas (Histórico)</div>
         </div>
      </div>
      
      <div className="absolute top-4 right-4 text-right pointer-events-none">
         <h3 className="text-xl font-black text-white tracking-tighter italic">ENGRAMA</h3>
         <p className="text-[10px] text-gray-500 font-mono">MAPA VETORIAL: {nodes.length} NÓS ATIVOS</p>
      </div>
    </div>
  );
};
