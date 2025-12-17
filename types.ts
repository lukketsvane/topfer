export interface SpreadImage {
  id: string;
  url: string;
  remoteUrl?: string;
  mimeType: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text?: string;
  images?: SpreadImage[];
  isThinking?: boolean;
}