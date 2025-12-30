
export interface VideoFile {
  id: string;
  file: File;
  name: string;
  url: string;
  categories: string[]; // Changed from string to string[]
  isFavorite: boolean; // New property
  thumbnail?: string;
  previewFrames?: string[]; // New property for the 5-frame preview
  duration?: string;
  size: string;
  addedAt: Date;
  description?: string;
  sourceLink?: {
    name: string;
    url: string;
  };
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface ClassificationResult {
  videoId: string;
  suggestedCategories: string[]; // Changed from suggestedCategory to array
  reason: string;
  description?: string;
  source?: {
    name: string;
    url: string;
  };
}