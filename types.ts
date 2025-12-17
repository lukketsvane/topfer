export interface SpreadImage {
  id: string;
  url: string;
  mimeType: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text?: string;
  images?: SpreadImage[];
  isThinking?: boolean;
}