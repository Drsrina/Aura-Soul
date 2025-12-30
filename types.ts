
export interface SoulState {
  felicidade: number;
  tristeza: number;
  solidão: number;
  medo: number;
  confusão: number;
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

export interface SessionSummary {
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

export interface AppState {
  isAwake: boolean;
  soul: SoulState;
  currentSessionId: string | null;
  sessions: Session[];
  summaries: string[]; // Strings simples para exibição/contexto
  awakeSince: number | null;
}
