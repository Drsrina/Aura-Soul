
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Smile, Frown, Ghost, Activity, Network, Search, AlertTriangle, MousePointer2, Flame, Skull } from 'lucide-react';
import { SoulState, EngramNode } from '../types';
import * as THREE from 'three';

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
  // --- LÓGICA DE COR ---
  const totalWeight = Math.max(1, 
    soul.felicidade + soul.tristeza + soul.medo + 
    (soul.raiva || 0) + (soul.nojo || 0)
  );
  
  const weightedHue = (
    (soul.felicidade * 45) +       // Amarelo/Laranja
    (soul.tristeza * 230) +        // Azul Escuro
    (soul.medo * 275) +            // Roxo
    ((soul.raiva || 0) * 0) +      // Vermelho Vivo
    ((soul.nojo || 0) * 100)       // Verde
  ) / totalWeight;

  const finalHue = totalWeight < 10 ? 220 : weightedHue;
  
  // Saturação
  const saturation = Math.min(100, Math.max(40, 
    60 + (soul.felicidade / 3) + ((soul.raiva || 0) / 2)
  ));
  
  // Luminosidade
  const lightness = Math.min(60, Math.max(30, 
    45 + (soul.felicidade / 5) - ((soul.raiva || 0) / 5)
  )); 

  // Pulso
  const pulseSpeed = Math.max(0.5, 
    (soul.medo / 10) + (soul.felicidade / 20) + ((soul.raiva || 0) / 8)
  ); 
  
  const scale = 0.8 + (soul.felicidade / 200) + ((soul.raiva || 0) / 300); 

  const sphereStyle = {
    background: `radial-gradient(circle at 35% 35%, 
        hsla(${finalHue}, ${saturation}%, 95%, 1) 0%, 
        hsla(${finalHue}, ${saturation}%, ${lightness + 10}%, 1) 20%, 
        hsla(${finalHue}, ${saturation}%, ${lightness}%, 1) 50%, 
        hsla(${finalHue}, ${saturation}%, ${lightness - 20}%, 1) 90%
    )`,
    boxShadow: `
        inset -10px -10px 20px hsla(${finalHue}, ${saturation}%, 10%, 0.5), 
        inset 10px 10px 20px hsla(${finalHue}, 100%, 90%, 0.4),
        0 0 ${30 + soul.felicidade + (soul.raiva || 0)}px hsla(${finalHue}, ${saturation}%, 50%, 0.6)
    `,
    transition: 'all 1.5s ease-in-out',
    '--orb-scale': isAwake ? scale : 0.4,
    '--pulse-duration': `${3 / pulseSpeed}s`,
    '--shimmer-color': `hsla(${finalHue}, 100%, 90%, 0.3)`
  } as React.CSSProperties;

  return (
    <div className="relative flex items-center justify-center w-full h-full min-h-[200px]">
      <div 
        style={sphereStyle} 
        className={`relative w-32 h-32 md:w-48 md:h-48 rounded-full z-10 overflow-hidden ${isAwake ? 'animate-orb-pulse' : 'grayscale opacity-30 blur-sm'}`} 
      >
        {isAwake && (
            <div className="absolute inset-0 w-[200%] h-[200%] top-[-50%] left-[-50%] animate-liquid-shimmer opacity-60 mix-blend-overlay"
                 style={{
                     background: `conic-gradient(from 0deg, transparent 0deg, var(--shimmer-color) 60deg, transparent 120deg)`
                 }}
            />
        )}
        {isAwake && (
            <div className="absolute top-[15%] left-[15%] w-[20%] h-[15%] bg-white rounded-[50%] blur-md opacity-70 pointer-events-none" />
        )}
      </div>
    </div>
  );
};

export const SoulStatus: React.FC<{ soul: SoulState }> = ({ soul }) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mb-4">
      <StatusBadge icon={Smile} color="text-yellow-400" label="Felicidade" value={soul.felicidade} />
      <StatusBadge icon={Flame} color="text-red-500" label="Raiva" value={soul.raiva || 0} />
      <StatusBadge icon={Skull} color="text-lime-500" label="Nojo" value={soul.nojo || 0} />
      <StatusBadge icon={Frown} color="text-blue-400" label="Tristeza" value={soul.tristeza} />
      <StatusBadge icon={Ghost} color="text-purple-400" label="Medo" value={soul.medo} />
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

// --- VISUALIZADOR DE ENGRAMA CUSTOMIZADO (THREE.JS PURO) ---
// Implementação manual para garantir estabilidade sem dependências pesadas externas
interface EngramGalaxyProps {
  nodes: EngramNode[];
  onNodeSelect: (node: EngramNode | null) => void;
  filters: string[];
}

export const EngramGalaxy: React.FC<EngramGalaxyProps> = ({ nodes, onNodeSelect, filters }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.70);
  const requestRef = useRef<number>(0);
  
  // State refs for animation loop access
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const nodeMeshesRef = useRef<THREE.Mesh[]>([]);
  const lineMeshRef = useRef<THREE.LineSegments | null>(null);
  const nodesDataRef = useRef<any[]>([]);
  const edgesDataRef = useRef<any[]>([]);

  // CRITICAL: Cache de posições para evitar reset aleatório a cada render
  const positionsCache = useRef<Map<string, {x: number, y: number, z: number}>>(new Map());

  // Safe parsing
  const parseEmbedding = (emb: any): number[] | null => {
    if (!emb) return null;
    if (Array.isArray(emb)) return emb;
    if (typeof emb === 'string') {
        try { return JSON.parse(emb); } catch (e) { return null; }
    }
    return null;
  };

  // 1. Process Data & Physics Init
  useEffect(() => {
    if (!nodes) return;
    
    // Filter
    const activeNodes = filters.length > 0 ? nodes.filter(n => filters.includes(n.group_type)) : nodes;
    
    // Map to physics objects
    nodesDataRef.current = activeNodes.map((n, idx) => {
       // Recupera posição antiga se existir (Estabilidade)
       const cached = positionsCache.current.get(n.id);
       return {
           ...n,
           embedding: parseEmbedding(n.embedding),
           x: cached ? cached.x : (Math.random() - 0.5) * 400,
           y: cached ? cached.y : (Math.random() - 0.5) * 400,
           z: cached ? cached.z : (Math.random() - 0.5) * 400,
           vx: 0, vy: 0, vz: 0,
           color: n.group_type === 'memory' ? 0x6366f1 : n.group_type === 'dream' ? 0xd946ef : n.group_type === 'thought' ? 0xf59e0b : 0x10b981
       };
    }).filter(n => n.embedding && n.embedding.length > 0);

    // Compute Edges
    const edges: any[] = [];
    const nData = nodesDataRef.current;
    const LIMIT = 300; 
    
    for (let i = 0; i < Math.min(nData.length, LIMIT); i++) {
        for (let j = i + 1; j < Math.min(nData.length, LIMIT); j++) {
            const sim = cosineSimilarity(nData[i].embedding, nData[j].embedding);
            if (sim > similarityThreshold) {
                edges.push({ source: i, target: j, val: sim });
            }
        }
    }
    edgesDataRef.current = edges;

    // Rebuild Scene Objects if scene exists
    if (sceneRef.current) rebuildSceneObjects();

  }, [nodes, filters, similarityThreshold]);

  const rebuildSceneObjects = () => {
      const scene = sceneRef.current;
      if (!scene) return;

      // Clear old meshes
      nodeMeshesRef.current.forEach(m => scene.remove(m));
      nodeMeshesRef.current = [];
      if (lineMeshRef.current) {
          scene.remove(lineMeshRef.current);
          lineMeshRef.current.geometry.dispose();
          lineMeshRef.current = null;
      }

      // Create Nodes
      const geometry = new THREE.SphereGeometry(3, 8, 8);
      nodesDataRef.current.forEach(node => {
          const material = new THREE.MeshBasicMaterial({ color: node.color });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(node.x, node.y, node.z);
          mesh.userData = { id: node.id, nodeData: node }; // Store data for raycasting
          scene.add(mesh);
          nodeMeshesRef.current.push(mesh);
      });

      // Create Lines (Empty Buffer initially)
      const lineGeo = new THREE.BufferGeometry();
      const lineCount = edgesDataRef.current.length;
      const positions = new Float32Array(lineCount * 2 * 3); // 2 points per line, 3 coords per point
      lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const lineMat = new THREE.LineBasicMaterial({ 
          color: 0xffffff, 
          transparent: true, 
          opacity: 0.15,
          blending: THREE.AdditiveBlending,
          depthWrite: false
      });
      
      const lineSegments = new THREE.LineSegments(lineGeo, lineMat);
      scene.add(lineSegments);
      lineMeshRef.current = lineSegments;
  };

  // 2. Three.js Setup
  useEffect(() => {
      if (!mountRef.current) return;

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x030712); // Gray 950
      scene.fog = new THREE.FogExp2(0x030712, 0.0015);
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
      camera.position.z = 400;
      cameraRef.current = camera;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      mountRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Initial Build
      rebuildSceneObjects();

      // Interaction State
      let isDragging = false;
      let previousMousePosition = { x: 0, y: 0 };
      let rotationTarget = { x: 0, y: 0 };
      const groupRotation = new THREE.Euler(0, 0, 0);

      // Raycaster
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const handleMouseDown = (e: MouseEvent) => {
          isDragging = true;
          previousMousePosition = { x: e.clientX, y: e.clientY };
      };

      const handleMouseMove = (e: MouseEvent) => {
          if (isDragging) {
              const deltaMove = {
                  x: e.clientX - previousMousePosition.x,
                  y: e.clientY - previousMousePosition.y
              };
              rotationTarget.y += deltaMove.x * 0.005;
              rotationTarget.x += deltaMove.y * 0.005;
              previousMousePosition = { x: e.clientX, y: e.clientY };
          }
      };

      const handleMouseUp = () => { isDragging = false; };

      const handleClick = (e: MouseEvent) => {
          if (isDragging) return; // Ignore drags
          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((e.clientX - rect.left) / width) * 2 - 1;
          mouse.y = -((e.clientY - rect.top) / height) * 2 + 1;

          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObjects(nodeMeshesRef.current);

          if (intersects.length > 0) {
              const nodeData = intersects[0].object.userData.nodeData;
              onNodeSelect(nodeData);
              // Simple "Focus" effect
              intersects[0].object.scale.set(1.5, 1.5, 1.5);
              setTimeout(() => {
                 if (intersects[0]?.object) intersects[0].object.scale.set(1, 1, 1);
              }, 300);
          } else {
              onNodeSelect(null);
          }
      };

      // Zoom
      const handleWheel = (e: WheelEvent) => {
          e.preventDefault();
          camera.position.z += e.deltaY * 0.5;
          camera.position.z = Math.max(50, Math.min(800, camera.position.z));
      };

      renderer.domElement.addEventListener('mousedown', handleMouseDown);
      renderer.domElement.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      renderer.domElement.addEventListener('click', handleClick);
      renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });

      // Animation Loop
      const animate = () => {
          // Physics Step
          const nodes = nodesDataRef.current;
          
          // 1. Central Gravity (Gentle pull to center)
          for (let i = 0; i < nodes.length; i++) {
              const n = nodes[i];
              n.vx -= n.x * 0.0005;
              n.vy -= n.y * 0.0005;
              n.vz -= n.z * 0.0005;
          }

          // 2. Repulsion (Optimized & Clamped)
          for (let i = 0; i < nodes.length; i++) {
              for (let j = i + 1; j < nodes.length; j++) {
                  const dx = nodes[i].x - nodes[j].x;
                  const dy = nodes[i].y - nodes[j].y;
                  const dz = nodes[i].z - nodes[j].z;
                  const d2 = dx*dx + dy*dy + dz*dz;
                  
                  // Prevents division by zero and extreme forces when too close
                  if (d2 > 1 && d2 < 30000) { 
                      let f = 400 / d2;
                      if (f > 0.5) f = 0.5; // CLAMP FORCE: Impede explosão

                      nodes[i].vx += dx * f * 0.01;
                      nodes[i].vy += dy * f * 0.01;
                      nodes[i].vz += dz * f * 0.01;
                      nodes[j].vx -= dx * f * 0.01;
                      nodes[j].vy -= dy * f * 0.01;
                      nodes[j].vz -= dz * f * 0.01;
                  }
              }
          }

          // 3. Links (Springs)
          const edges = edgesDataRef.current;
          for (let i = 0; i < edges.length; i++) {
              const e = edges[i];
              const s = nodes[e.source];
              const t = nodes[e.target];
              const dx = t.x - s.x;
              const dy = t.y - s.y;
              const dz = t.z - s.z;
              const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
              if (dist > 0) {
                  const targetDist = 20 + (1 - e.val) * 200;
                  const force = (dist - targetDist) * 0.005;
                  const fx = (dx/dist) * force;
                  const fy = (dy/dist) * force;
                  const fz = (dz/dist) * force;
                  s.vx += fx; s.vy += fy; s.vz += fz;
                  t.vx -= fx; t.vy -= fy; t.vz -= fz;
              }
          }

          // Update Positions & Meshes
          const positions = lineMeshRef.current?.geometry.attributes.position.array as Float32Array;
          
          for (let i = 0; i < nodes.length; i++) {
              const n = nodes[i];
              // Friction: quanto menor, mais "gelatinoso" e menos rápido
              n.vx *= 0.92; 
              n.vy *= 0.92; 
              n.vz *= 0.92; 
              
              n.x += n.vx; n.y += n.vy; n.z += n.vz;
              
              // Update Cache for re-renders
              positionsCache.current.set(n.id, {x: n.x, y: n.y, z: n.z});

              if (nodeMeshesRef.current[i]) {
                  nodeMeshesRef.current[i].position.set(n.x, n.y, n.z);
              }
          }

          // Update Lines
          if (positions) {
              for (let i = 0; i < edges.length; i++) {
                  const e = edges[i];
                  const s = nodes[e.source];
                  const t = nodes[e.target];
                  
                  positions[i * 6] = s.x;
                  positions[i * 6 + 1] = s.y;
                  positions[i * 6 + 2] = s.z;
                  positions[i * 6 + 3] = t.x;
                  positions[i * 6 + 4] = t.y;
                  positions[i * 6 + 5] = t.z;
              }
              lineMeshRef.current!.geometry.attributes.position.needsUpdate = true;
          }

          // Smooth Rotation
          scene.rotation.y += (rotationTarget.y - scene.rotation.y) * 0.1;
          scene.rotation.x += (rotationTarget.x - scene.rotation.x) * 0.1;
          
          // Constant Slow Spin
          rotationTarget.y += 0.0005;

          renderer.render(scene, camera);
          requestRef.current = requestAnimationFrame(animate);
      };
      
      animate();

      return () => {
          cancelAnimationFrame(requestRef.current);
          if (mountRef.current && renderer.domElement) {
              mountRef.current.removeChild(renderer.domElement);
          }
          renderer.domElement.removeEventListener('mousedown', handleMouseDown);
          renderer.domElement.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          renderer.domElement.removeEventListener('click', handleClick);
          renderer.domElement.removeEventListener('wheel', handleWheel);
          renderer.dispose();
      };
  }, []);

  return (
    <div ref={mountRef} className="w-full h-full relative rounded-3xl overflow-hidden border border-white/5 bg-gray-900 cursor-move">
       {/* UI Overlay */}
       <div className="absolute top-16 right-4 z-10 flex flex-col gap-2 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-3 pointer-events-auto">
                <h4 className="text-[10px] font-bold text-white/50 uppercase mb-2 flex items-center gap-2">
                    <Network size={12} /> Neural Space
                </h4>
                <div className="mt-4 border-t border-white/10 pt-2">
                    <label className="text-[9px] text-white/50 block mb-1 font-mono">Sim. Threshold: {similarityThreshold.toFixed(2)}</label>
                    <input 
                        type="range" 
                        min="0.5" 
                        max="0.99" 
                        step="0.01" 
                        value={similarityThreshold} 
                        onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>
       </div>

       {nodes.length === 0 && (
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="text-center text-white/30 max-w-md p-6 border border-dashed border-white/10 rounded-3xl bg-black/20">
                   <AlertTriangle className="mx-auto mb-3 text-amber-500/80" size={32} />
                   <h3 className="text-lg font-medium text-white mb-2">Engrama Offline</h3>
               </div>
           </div>
       )}
       
       <div className="absolute bottom-4 left-4 pointer-events-none opacity-40 text-[10px] text-white/50 font-sans z-10 bg-black/40 p-2 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
                <MousePointer2 size={10}/> <span>Clique: Focar</span>
            </div>
            <div className="mt-1">Scroll: Zoom | Drag: Girar</div>
         </div>
    </div>
  );
};
