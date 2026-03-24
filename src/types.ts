export interface ArtisanGuide {
  title: string;
  safety: string;
  tools: string[];
  steps: { step: number; instruction: string }[];
  pro_tip: string;
  bing_query: string;
  youtube_query: string;
  timestamp: number;
  id: string;
  images?: string[];
  videoId?: string;
  feedback?: 'up' | 'down';
}

export interface SavedGuide extends ArtisanGuide {}
