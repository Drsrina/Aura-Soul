
export interface SoulState {
  felicidade: number;
  tristeza: number;
  solidão: number;
  medo: number;
  confusão: number;
  perguntas: string[];
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

export interface MemorySummary {
  id: string;
  summary: string;
  interactionCount: number;
  timestamp: number;
}

export interface AppState {
  isAwake: boolean;
  soul: SoulState;
  currentSessionId: string | null;
  sessions: Session[];
  summaries: MemorySummary[];
  awakeSince: number | null;
}
