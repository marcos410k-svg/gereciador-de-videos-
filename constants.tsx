import React from 'react';
import { 
  Film, 
  Folder, 
  Smartphone, 
  Tv, 
  User, 
  Video, 
  Star, 
  Clock, 
  Hash,
  Sparkles,
  Heart,
  Flame,
  Zap,
  Eye,
  Camera
} from 'lucide-react';
import { Category } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Anal', color: 'bg-purple-600' },
  { id: '2', name: 'Vaginal', color: 'bg-pink-600' },
  { id: '3', name: 'Negras', color: 'bg-stone-600' },
  { id: '4', name: 'Oral', color: 'bg-blue-500' },
  { id: '5', name: 'Amador', color: 'bg-green-600' },
  { id: '6', name: 'Latinas', color: 'bg-orange-600' },
  { id: '7', name: 'Asiáticas', color: 'bg-red-500' },
  { id: '8', name: 'Compilation', color: 'bg-yellow-600' },
  { id: '9', name: 'Sem Categoria', color: 'bg-slate-500' },
];

export const CATEGORY_COLORS = [
  'bg-slate-500',
  'bg-red-600',
  'bg-orange-600',
  'bg-amber-600',
  'bg-yellow-600',
  'bg-lime-600',
  'bg-green-600',
  'bg-emerald-600',
  'bg-teal-600',
  'bg-cyan-600',
  'bg-sky-600',
  'bg-blue-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-purple-600',
  'bg-fuchsia-600',
  'bg-pink-600',
  'bg-rose-600',
  'bg-stone-600',
  'bg-neutral-600',
];

export const ICONS = {
  All: <Film className="w-5 h-5" />,
  Folder: <Folder className="w-5 h-5" />,
  Mobile: <Smartphone className="w-5 h-5" />,
  TV: <Tv className="w-5 h-5" />,
  User: <User className="w-5 h-5" />,
  Video: <Video className="w-5 h-5" />,
  Star: <Star className="w-5 h-5" />,
  Recent: <Clock className="w-5 h-5" />,
  Tag: <Hash className="w-5 h-5" />,
  AI: <Sparkles className="w-5 h-5" />,
  Heart: <Heart className="w-5 h-5" />,
  Flame: <Flame className="w-5 h-5" />,
  Zap: <Zap className="w-5 h-5" />,
  Eye: <Eye className="w-5 h-5" />,
  Camera: <Camera className="w-5 h-5" />,
};