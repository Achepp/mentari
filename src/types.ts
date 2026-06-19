export interface StudentResponse {
  id: string;
  name: string;
  content: string;
  feedback?: string;
  status: 'idle' | 'generating' | 'success' | 'error';
  errorMsg?: string;
  wordCount?: number;
  sentiment?: 'Positif' | 'Netral' | 'Perlu Perbaikan';
  completenessScore?: number; // 0 - 100
}

export interface FeedbackSession {
  id: string;
  title: string;
  date: string;
  topic: string;
  style: string;
  responses: StudentResponse[];
}

export type FeedbackStyle = 'formal' | 'apresiatif' | 'motivatif' | 'kritis' | 'singkat';
