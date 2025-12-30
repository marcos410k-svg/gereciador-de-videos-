import React, { useState, useRef, useEffect } from 'react';
import { VideoFile } from '../types';
import { Play, Trash2, Check, X, Flame, Plus } from 'lucide-react';

interface VideoCardProps {
  video: VideoFile;
  onPlay: (video: VideoFile) => void;
  onDelete: (id: string) => void;
  onToggleCategory: (id: string, category: string) => void;
  categories: string[];
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  disableHover?: boolean;
  onRename: (id: string, newName: string) => void;
  onToggleFavorite: (id: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ 
  video, 
  onPlay, 
  onDelete, 
  onToggleCategory, 
  categories,
  isSelected,
  onToggleSelect,
  disableHover = false,
  onRename,
  onToggleFavorite
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(video.name);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const availableToAdd = categories.filter(c => !video.categories.includes(c) && c !== 'Sem Categoria');

  useEffect(() => {
    if (disableHover) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsHovering(false);
      setCurrentFrameIndex(0);
    }
  }, [disableHover]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleMouseEnter = () => {
    if (disableHover) return;
    timeoutRef.current = setTimeout(() => {
      setIsHovering(true);
      // Start cycling frames if available
      if (video.previewFrames && video.previewFrames.length > 0) {
        intervalRef.current = setInterval(() => {
          setCurrentFrameIndex(prev => (prev + 1) % (video.previewFrames?.length || 1));
        }, 600); // Mudar frame a cada 600ms
      }
    }, 400);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsHovering(false);
    setCurrentFrameIndex(0);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('videoId', video.id);
    e.dataTransfer.effectAllowed = 'copy';
    // Adiciona uma imagem fantasma personalizada se desejar, ou deixa o padrão
  };

  useEffect(() => {
    return () => { 
      if (timeoutRef.current) clearTimeout(timeoutRef.current); 
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleSaveRename = () => {
    if (editName.trim() && editName !== video.name) onRename(video.id, editName.trim());
    else setEditName(video.name);
    setIsEditing(false);
  };

  const currentImage = (isHovering && video.previewFrames && video.previewFrames.length > 0) 
    ? video.previewFrames[currentFrameIndex] 
    : video.thumbnail;

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      className={`group relative bg-slate-800/40 rounded-xl overflow-hidden border transition-all duration-200 hover:shadow-xl cursor-grab active:cursor-grabbing ${
        isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/50 bg-indigo-500/10' : 'border-slate-700/50 hover:border-indigo-500/50'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        onClick={(e) => { e.stopPropagation(); onToggleSelect(video.id); }}
        className={`absolute top-2 left-2 z-20 w-6 h-6 rounded-lg border-2 cursor-pointer flex items-center justify-center transition-all ${
          isSelected ? 'bg-indigo-600 border-indigo-600 opacity-100' : 'bg-black/40 border-white/30 opacity-0 group-hover:opacity-100'
        }`}
      >
        {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(video.id); }}
        className={`absolute top-2 right-2 z-20 p-1.5 rounded-full transition-all ${
          video.isFavorite ? 'bg-black/50 text-orange-500 opacity-100' : 'bg-black/40 text-white/50 hover:text-orange-400 hover:bg-black/60 opacity-0 group-hover:opacity-100'
        }`}
      >
        <Flame className="w-5 h-5" fill={video.isFavorite ? "currentColor" : "none"} strokeWidth={video.isFavorite ? 0 : 2} />
      </button>

      <div className="aspect-video relative overflow-hidden bg-slate-900" onClick={() => onPlay(video)}>
        {currentImage ? (
          <img 
            src={`data:image/jpeg;base64,${currentImage}`} 
            className={`w-full h-full object-cover transition-transform duration-500 ${isHovering ? 'scale-105' : 'group-hover:scale-105'}`} 
            alt={video.name} 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Play className="w-12 h-12 text-slate-600" /></div>
        )}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-xs font-medium text-white z-10 pointer-events-none">{video.size}</div>
      </div>
      
      <div className="p-4 flex flex-col h-[110px]">
        {isEditing ? (
           <input
             ref={inputRef}
             type="text"
             value={editName}
             onChange={(e) => setEditName(e.target.value)}
             onBlur={handleSaveRename}
             onKeyDown={(e) => e.key === 'Enter' ? handleSaveRename() : e.key === 'Escape' && setIsEditing(false)}
             onClick={(e) => e.stopPropagation()}
             className="w-full bg-slate-900 border border-indigo-500 rounded px-2 py-0.5 text-sm font-semibold text-white focus:outline-none mb-2"
           />
        ) : (
          <h3 
            className="text-sm font-semibold text-slate-200 truncate mb-2 group-hover:text-white cursor-text select-none shrink-0" 
            title={video.name}
            onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditName(video.name); }}
          >
            {video.name}
          </h3>
        )}
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-wrap content-start gap-1.5 scrollbar-thin scrollbar-thumb-slate-700">
          {video.categories.map(cat => (
            <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-700/50 text-indigo-200 text-[10px] border border-slate-600 hover:bg-slate-600 transition-colors">
              {cat}
              <button onClick={(e) => { e.stopPropagation(); onToggleCategory(video.id, cat); }} className="hover:text-white"><X className="w-3 h-3" /></button>
            </span>
          ))}

          <div className="relative inline-block group/add w-5 h-5">
             <select 
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
               value=""
               onChange={(e) => { if(e.target.value) onToggleCategory(video.id, e.target.value); }}
               onClick={(e) => e.stopPropagation()}
             >
                <option value="" disabled>+</option>
                {availableToAdd.map(cat => <option key={cat} value={cat}>{cat}</option>)}
             </select>
             <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 border-dashed hover:text-white hover:border-slate-500 hover:bg-slate-700">
               <Plus className="w-3 h-3" />
             </div>
          </div>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(video.id); }}
          className="absolute bottom-3 right-3 p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 bg-slate-900/80 rounded-full"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default VideoCard;