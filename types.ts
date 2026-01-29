export enum SkillMode {
  DASHBOARD = 'dashboard',
  SPEAKING = 'speaking',
  WRITING = 'writing',
  SETTINGS = 'settings'
}

export interface UserStats {
  speakingScore: number[];
  writingScore: number[];
  lessonsCompleted: number;
  streak: number;
  lastPractice: string;
}

export interface FeedbackItem {
  original: string;
  correction: string;
  explanation: string;
  type: 'grammar' | 'vocabulary' | 'pronunciation' | 'coherence';
}

export interface AIResponse {
  score: number;
  scoreBreakdown?: Record<string, number>; // Detailed score criteria
  feedback: string; // General feedback
  detailedErrors: FeedbackItem[];
  improvedVersion?: string; // For writing
  transcription?: string; // For speaking
}

export interface ChatMessage {
  role: 'ai' | 'user';
  text: string;
  audioUrl?: string; // Optional: if we want to play back user audio
}

export interface HistoryItem {
  id: string;
  date: string;
  mode: 'speaking' | 'writing';
  score: number;
  summary: string;
}

// Gemini specific types
export interface GeminiConfig {
  apiKey: string;
}