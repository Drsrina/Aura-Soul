
export interface SoulState {
  felicidade: number;
  tristeza: number;
  medo: number;
  raiva: number;
  nojo: number;
  perguntas: string[];
  visual_cue?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
}

export interface Thought {
  id: string;
  content: string;
  timestamp: number;
  triggeredBy?: 'time' | 'interaction';
}

export interface Session {
  id: string;
  date: string;
  startTime: number;
  endTime?: number;
  interactions: Message[];
  thoughts: Thought[];
}

export interface Dream {
  id: string;
  content: string;
  created_at: string;
}

export interface SystemLog {
  id: string;
  timestamp: number;
  type: 'info' | 'error' | 'warn' | 'success';
  message: string;
  context?: string;
}

export interface EngramNode {
  id: string;
  group_type: 'memory' | 'dream' | 'thought' | 'interaction';
  content: string;
  embedding: number[]; // Vetor de 768 dimensões
  created_at: string;
  // Propriedades visuais e de busca
  relevance?: number; // 0 a 1, calculado via busca vetorial no frontend
  x?: number;
  y?: number;
  z?: number;
}

export interface AppState {
  isAwake: boolean;
  soul: SoulState;
  currentSessionId: string | null;
  sessions: Session[];
  dreams: string[]; // Contexto abstrato/emocional de sessões passadas
  awakeSince: number | null;
}
