export interface ArtisanGuide {
  title: string;
  safety: string;
  tools: string[];
  steps: { step: number; instruction: string }[];
  pro_tip: string;
  youtube_query: string;
  timestamp: number;
  id: string;
  videoId?: string;
  feedback?: 'up' | 'down';
}

export interface SavedGuide extends ArtisanGuide {}
