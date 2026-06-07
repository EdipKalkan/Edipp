export type Theme = "dark" | "light";
export type ExplanationMode = "professional" | "student" | "simple";
export type TabName = "home" | "timer" | "analysis" | "coach" | "stats" | "flashcards" | "settings" | "chat" | "test" | "quiz";

export interface AppSettings {
  apiKey: string;
  theme: Theme;
  language: string; // Default: "tr"
  explanationMode: ExplanationMode;
  selected_model?: string;
  explanation_level?: "Ekonomik" | "Dengeli" | "Kaliteli";
  api_reduction_mode?: boolean;
}

export interface DB_Subject {
  id: string;
  name: string;
  exam_type: string; // e.g. "TYT", "AYT", "LGS"
  color: string;
  created_at: string;
  updated_at: string;
}

export interface DB_Topic {
  id: string;
  subject_id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface DB_StudySession {
  id: string;
  subject_id: string;
  topic_id?: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  status: "completed" | "paused" | "interrupted";
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface GeoStudyMarker {
  id: string;
  title: string;
  type: "dağ" | "boğaz" | "göl" | "ova" | "akarsu" | "iklim";
  lat: number;
  lng: number;
  importance: string; // Sınavda çıkış sebebi (e.g., "Menteşe dağları kıyıya paraleldir, çok yağış alır")
  details: string; // Detay açıklama
}

export interface PDFDoc {
  fileName: string;
  fileSize: string;
  extractedText: string;
  pageCount: number;
  uploadDate: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface SavedAnalysis {
  fileName: string;
  summary?: string;
  studentExplainer?: string;
  examNotes?: string;
  chatHistory: ChatMessage[];
  tests: SavedTest[];
  flashcards?: Flashcard[];
}

export interface TestQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string; // e.g. "A" | "B" | "C" | "D"
  explanation: string;
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  memorized?: boolean;
}

export interface DB_Mistake {
  id: string;
  subject_id: string;
  topic_id?: string;
  question_text: string;
  user_answer?: string;
  correct_answer?: string;
  mistake_type: "carelessness" | "knowledge_gap" | "misreading" | "time_pressure" | "unknown";
  analysis_text?: string;
  solution_strategy?: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedTest {
  id: string;
  difficulty: "kolay" | "orta" | "zor";
  questionCount: number;
  questions: TestQuestion[];
  userAnswers: Record<number, string>; // questionId -> selectedOption
  score?: number;
  timeTaken?: number; // Time spent on the quiz in seconds
  date: string;
}
