
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Smile, Frown, Ghost, Activity, ZoomIn, ZoomOut, RefreshCw, Network } from 'lucide-react';
import { SoulState, EngramNode } from '../types';

interface SoulOrbProps {
  soul: SoulState;
  isAwake: boolean;
}

// --- UTILITÁRIOS ---
function cosineSimilarity(vecA: number[], vecB: number[]) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const den = Math.sqrt(normA) * Math.sqrt(normB);
    if (den === 0) return 0;
    return dot / den;
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

// --- VISUALIZADOR DE ENGRAMA (PHYSICS ENGINE 3D) ---
interface EngramGalaxyProps {
  nodes: EngramNode[];
  onNodeSelect: (node: EngramNode | null) => void;
  filters: string[];
}

// Tipo estendido para física
interface PhysicsNode extends EngramNode {
    index: number;
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    color: string;
    // Props de projeção para render
    x2d?: number;
    y2d?: number;
    zProjected?: number;
    scale?: number;
    alpha?: number;
    size?: number;
}

export const EngramGalaxy: React.FC<EngramGalaxyProps> = ({ nodes, onNodeSelect, filters }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Physics State (Mutable Refs para performance no loop)
  const physicsNodesRef = useRef<PhysicsNode[]>([]);
  const initializedRef = useRef(false);

  // Threshold State
  const [similarityThreshold, setSimilarityThreshold] = useState(0.70);
  const thresholdRef = useRef(similarityThreshold); 

  useEffect(() => {
    thresholdRef.current = similarityThreshold;
  }, [similarityThreshold]);
  
  // Camera State
  const camera = useRef({
    rotationX: 0,
    rotationY: 0,
    zoom: 2.5, // ZOOM INICIAL PADRÃO (Balanceado para a nova fórmula)
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
  });

  // 1. Inicialização dos Nós (Executa apenas quando a prop 'nodes' muda drasticamente)
  useEffect(() => {
    if (nodes.length === 0) return;

    // Se já temos nós simulando, tentamos preservar posições dos que existem pelo ID
    const prevNodesMap = new Map(physicsNodesRef.current.map(n => [n.id, n]));
    
    physicsNodesRef.current = nodes.map((n, idx) => {
        const prev = prevNodesMap.get(n.id);
        return {
            ...n,
            index: idx,
            // Se já existia, mantém posição e inércia. Se não, posição aleatória.
            x: prev ? prev.x : (Math.random() - 0.5) * 800,
            y: prev ? prev.y : (Math.random() - 0.5) * 800,
            z: prev ? prev.z : (Math.random() - 0.5) * 800,
            vx: prev ? prev.vx : 0,
            vy: prev ? prev.vy : 0,
            vz: prev ? prev.vz : 0,
            color: n.group_type === 'memory' ? '#4f46e5' : 
                   n.group_type === 'dream' ? '#d946ef' : 
                   n.group_type === 'thought' ? '#f59e0b' : 
                   '#10b981'
        };
    });
    initializedRef.current = true;
  }, [nodes]);

  // 2. Pré-cálculo de Conexões (Edges)
  const physicsEdges = useMemo(() => {
      const edges: { aIndex: number, bIndex: number, sim: number, targetDist: number, strength: number }[] = [];
      const count = nodes.length;
      if (count > 200) return []; 

      for (let i = 0; i < count; i++) {
          for (let j = i + 1; j < count; j++) {
              const nodeA = nodes[i];
              const nodeB = nodes[j];
              
              if (nodeA.embedding && nodeB.embedding) {
                  const sim = cosineSimilarity(nodeA.embedding, nodeB.embedding);
                  if (sim > 0.4) {
                      const targetDist = 20 + (1 - sim) * 500;
                      const strength = 0.05 * Math.pow(sim, 2); 
                      edges.push({ aIndex: i, bIndex: j, sim, targetDist, strength });
                  }
              }
          }
      }
      return edges;
  }, [nodes]);

  // Handler de Click
  const handleClick = (e: React.MouseEvent) => {
      if (camera.current.isDragging) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      let clickedNode = null;
      let minZ = Infinity;

      physicsNodesRef.current.forEach(node => {
         if (filters.length > 0 && !filters.includes(node.group_type)) return;
         if (!node.x2d || !node.y2d || !node.zProjected) return;
         
         const dist = Math.sqrt(Math.pow(clickX - node.x2d, 2) + Math.pow(clickY - node.y2d, 2));
         // Aumenta a área de click baseada no tamanho visual do nó
         const hitRadius = Math.max(15, node.size * (node.scale || 1) * 2);
         
         if (dist < hitRadius && node.zProjected < minZ) {
             minZ = node.zProjected;
             clickedNode = node;
         }
      });
      onNodeSelect(clickedNode);
  };

  const handleZoomIn = () => { camera.current.zoom = Math.min(camera.current.zoom + 0.5, 15); };
  const handleZoomOut = () => { camera.current.zoom = Math.max(camera.current.zoom - 0.5, 0.5); }; 
  const handleReset = () => { 
      camera.current.zoom = 2.5; 
      camera.current.rotationX = 0; 
      camera.current.rotationY = 0; 
  };

  // --- RENDER & PHYSICS LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;

    const render = () => {
        canvas.width = canvas.parentElement?.clientWidth || 800;
        canvas.height = canvas.parentElement?.clientHeight || 600;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        ctx.fillStyle = '#030712'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cam = camera.current;
        const currentThreshold = thresholdRef.current;
        const pNodes = physicsNodesRef.current;
        const pEdges = physicsEdges;

        // --- PASSO 1: FÍSICA ---
        for (let i = 0; i < pNodes.length; i++) {
            const node = pNodes[i];
            // Gravidade Central Suave
            node.vx -= node.x * 0.0005;
            node.vy -= node.y * 0.0005;
            node.vz -= node.z * 0.0005;

            // Repulsão Otimizada
            for (let j = i + 1; j < pNodes.length; j++) {
                const other = pNodes[j];
                const dx = node.x - other.x;
                const dy = node.y - other.y;
                const dz = node.z - other.z;
                const distSq = dx*dx + dy*dy + dz*dz;
                
                if (distSq > 0 && distSq < 100000) {
                    const force = 2000 / distSq;
                    const dist = Math.sqrt(distSq);
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    const fz = (dz / dist) * force;
                    
                    node.vx += fx;
                    node.vy += fy;
                    node.vz += fz;
                    other.vx -= fx;
                    other.vy -= fy;
                    other.vz -= fz;
                }
            }
        }

        for (let i = 0; i < pEdges.length; i++) {
            const edge = pEdges[i];
            const nodeA = pNodes[edge.aIndex];
            const nodeB = pNodes[edge.bIndex];
            
            if (!nodeA || !nodeB) continue;

            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const dz = nodeB.z - nodeA.z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (dist === 0) continue;

            const displacement = dist - edge.targetDist;
            const force = displacement * edge.strength;

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            const fz = (dz / dist) * force;

            nodeA.vx += fx;
            nodeA.vy += fy;
            nodeA.vz += fz;
            nodeB.vx -= fx;
            nodeB.vy -= fy;
            nodeB.vz -= fz;
        }

        for (let i = 0; i < pNodes.length; i++) {
            const node = pNodes[i];
            node.vx *= 0.92;
            node.vy *= 0.92;
            node.vz *= 0.92;
            node.x += node.vx;
            node.y += node.vy;
            node.z += node.vz;
        }

        // --- PASSO 2: RENDERIZAÇÃO (Nova Projeção) ---
        const activeNodesMap = new Map();

        const visibleNodes = pNodes.map(node => {
            if (filters.length > 0 && !filters.includes(node.group_type)) return null;

            // Rotação da Câmera
            let x = node.x * Math.cos(cam.rotationY) - node.z * Math.sin(cam.rotationY);
            let z = node.z * Math.cos(cam.rotationY) + node.x * Math.sin(cam.rotationY);
            let y = node.y * Math.cos(cam.rotationX) - z * Math.sin(cam.rotationX);
            z = z * Math.cos(cam.rotationX) + node.y * Math.sin(cam.rotationX);

            // NOVA PROJEÇÃO: Distância da Câmera ao Objeto
            // Aumentamos a constante base para 1500 para criar mais profundidade inicial
            const zDist = z + (1500 / cam.zoom);

            // Clipping plane mais próximo (permite chegar "na cara" do nó)
            if (zDist < 30) return null; 

            // FÓRMULA DE PERSPECTIVA REAL (focal_length / distance)
            // Isso permite que o scale fique > 1 (Magnificação Real)
            const perspective = 600 / zDist; 

            const x2d = x * perspective + cx;
            const y2d = y * perspective + cy;

            // Update node visual properties
            node.x2d = x2d;
            node.y2d = y2d;
            node.zProjected = zDist;
            node.scale = perspective; // Salva para uso no hit test

            let alpha = 1;
            let size = 3;
            if (typeof node.relevance === 'number') {
                if (node.relevance < 0.35) {
                    alpha = 0.1;
                    size = 1;
                } else {
                    alpha = 1;
                    size = 3 + (node.relevance * 5);
                }
            }
            
            // Depth Fade melhorado para a nova escala
            alpha = alpha * Math.min(1, 4000 / (zDist * zDist * 0.005));

            const vNode = { ...node, x2d, y2d, perspective, z: zDist, alpha, size };
            activeNodesMap.set(node.index, vNode);
            return vNode;
        }).filter(n => n !== null);

        // Renderização
        ctx.lineWidth = 0.5;
        pEdges.forEach(edge => {
            if (edge.sim < currentThreshold) return;

            const nodeA = activeNodesMap.get(edge.aIndex);
            const nodeB = activeNodesMap.get(edge.bIndex);

            if (nodeA && nodeB) {
                const visualStrength = (edge.sim - currentThreshold) / (1 - currentThreshold); 
                const alpha = Math.max(0.05, Math.min(0.6, visualStrength)) * Math.min(nodeA.alpha, nodeB.alpha);
                
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(nodeA.x2d, nodeA.y2d);
                ctx.lineTo(nodeB.x2d, nodeB.y2d);
                ctx.stroke();
            }
        });

        visibleNodes.sort((a, b) => b!.z - a!.z);
        
        visibleNodes.forEach(n => {
            const node = n!;
            ctx.beginPath();
            // Raio agora multiplica pela perspectiva real, permitindo círculos grandes
            ctx.arc(node.x2d, node.y2d, node.size * node.perspective, 0, Math.PI * 2);
            ctx.fillStyle = node.color;
            ctx.globalAlpha = node.alpha;
            ctx.fill();
            
            if (node.size > 4) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = node.color;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            ctx.globalAlpha = 1;
        });

        animationFrame = requestAnimationFrame(render);
    };

    render();

    // Event Listeners
    const handleMouseDown = (e: MouseEvent) => {
        camera.current.isDragging = true;
        camera.current.lastMouseX = e.clientX;
        camera.current.lastMouseY = e.clientY;
    };
    const handleMouseUp = () => { camera.current.isDragging = false; };
    const handleMouseMove = (e: MouseEvent) => {
        if (camera.current.isDragging) {
            const deltaX = e.clientX - camera.current.lastMouseX;
            const deltaY = e.clientY - camera.current.lastMouseY;
            camera.current.rotationY += deltaX * 0.005;
            camera.current.rotationX += deltaY * 0.005;
            camera.current.lastMouseX = e.clientX;
            camera.current.lastMouseY = e.clientY;
        }
    };
    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        // Sensibilidade calibrada para o novo sistema exponencial
        const newZoom = camera.current.zoom - (e.deltaY * 0.003); 
        camera.current.zoom = Math.min(Math.max(newZoom, 0.5), 15); 
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
        cancelAnimationFrame(animationFrame);
        canvas.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('wheel', handleWheel);
    };
  }, [nodes, filters, physicsEdges]); 

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/5 bg-gray-900 cursor-move group">
      <canvas ref={canvasRef} onClick={handleClick} className="block w-full h-full" />
      
      {/* Legenda Estática */}
      <div className="absolute bottom-4 left-4 pointer-events-none p-4 bg-black/60 backdrop-blur-md rounded-xl border border-white/10">
         <div className="space-y-1">
            <div className="flex items-center gap-2 text-[9px] text-gray-300"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Memória</div>
            <div className="flex items-center gap-2 text-[9px] text-gray-300"><span className="w-2 h-2 rounded-full bg-fuchsia-500"></span> Sonhos</div>
            <div className="flex items-center gap-2 text-[9px] text-gray-300"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pensamentos</div>
            <div className="flex items-center gap-2 text-[9px] text-gray-300"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Conversas</div>
         </div>
      </div>

      {/* PAINEL DE CONTROLE */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-3 items-end opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
          
          <div className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col items-center gap-2 w-32">
              <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                  <Network size={10} /> Conexões Visuais
              </div>
              <input 
                type="range" 
                min="0.4" 
                max="0.99" 
                step="0.01" 
                value={similarityThreshold} 
                onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
              />
              <span className="text-[9px] font-mono text-indigo-300">{Math.round(similarityThreshold * 100)}% Match</span>
          </div>

          <div className="flex flex-col gap-2 p-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10">
            <button onClick={handleZoomIn} className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors" title="Zoom In">
                <ZoomIn size={16} />
            </button>
            <button onClick={handleZoomOut} className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors" title="Zoom Out">
                <ZoomOut size={16} />
            </button>
            <button onClick={handleReset} className="p-2 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors" title="Reset View">
                <RefreshCw size={16} />
            </button>
          </div>
      </div>
    </div>
  );
};
