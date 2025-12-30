import React, { useState } from 'react';
import { Category, VideoFile } from '../types';
import { LayoutGrid, Sparkles, Settings } from 'lucide-react';
import { ICONS } from '../constants';

interface SidebarProps {
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
  onAutoOrganize: () => void;
  onManageCategories: () => void;
  isOrganizing: boolean;
  videos: VideoFile[];
  onDropOnCategory: (videoId: string, categoryName: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  categories, 
  activeCategory, 
  onSelectCategory,
  onAutoOrganize,
  onManageCategories,
  isOrganizing,
  videos,
  onDropOnCategory
}) => {
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  const getCategoryCount = (catName: string) => {
    if (catName === 'All') return videos.length;
    if (catName === 'Favoritos') return videos.filter(v => v.isFavorite).length;
    if (catName === 'Sem Categoria') {
      return videos.filter(v => v.categories.length === 0 || v.categories.includes('Sem Categoria')).length;
    }
    return videos.filter(v => v.categories.includes(catName)).length;
  };

  const handleDragOver = (e: React.DragEvent, categoryName: string) => {
    e.preventDefault();
    if (categoryName !== 'All' && categoryName !== 'Sem Categoria' && categoryName !== 'Favoritos') {
        setDragOverCategory(categoryName);
    }
  };

  const handleDragLeave = () => {
    setDragOverCategory(null);
  };

  const handleDrop = (e: React.DragEvent, categoryName: string) => {
    e.preventDefault();
    setDragOverCategory(null);
    const videoId = e.dataTransfer.getData('videoId');
    if (videoId && categoryName !== 'All') {
      onDropOnCategory(videoId, categoryName);
    }
  };

  return (
    <div className="w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <LayoutGrid className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          VidiSort AI
        </h1>
      </div>

      <div className="px-4 mb-6">
        <button
          onClick={onAutoOrganize}
          disabled={isOrganizing || videos.length === 0}
          className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-all ${
            isOrganizing 
              ? 'bg-slate-800 text-slate-400 cursor-wait' 
              : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25'
          } ${videos.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Sparkles className={`w-4 h-4 ${isOrganizing ? 'animate-spin' : ''}`} />
          {isOrganizing ? 'Organizando...' : 'Organizar com IA'}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 space-y-1">
        <button
          onClick={() => onSelectCategory('All')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            activeCategory === 'All' 
              ? 'bg-slate-800 text-white' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-3">
             {ICONS.All}
             Todos os Vídeos
          </div>
          <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
            {videos.length}
          </span>
        </button>

        <button
          onClick={() => onSelectCategory('Favoritos')}
          onDragOver={(e) => handleDragOver(e, 'Favoritos')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'Favoritos')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            activeCategory === 'Favoritos' 
              ? 'bg-slate-800 text-white' 
              : dragOverCategory === 'Favoritos' ? 'bg-orange-500/20 text-orange-200 border border-orange-500/50' : 'text-slate-400 hover:text-orange-400 hover:bg-slate-800/50'
          }`}
        >
          <div className="flex items-center gap-3">
             {ICONS.Flame}
             Favoritos
          </div>
          <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
            {getCategoryCount('Favoritos')}
          </span>
        </button>

        <div className="flex items-center justify-between px-4 pt-4 pb-2">
           <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Categorias
          </div>
          <button 
            onClick={onManageCategories}
            className="text-slate-500 hover:text-white transition-colors"
            title="Gerenciar Categorias"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {categories.map((category) => {
          const count = getCategoryCount(category.name);
          const isDragTarget = dragOverCategory === category.name;
          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.name)}
              onDragOver={(e) => handleDragOver(e, category.name)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, category.name)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors group ${
                isDragTarget
                  ? 'bg-indigo-500/30 text-white ring-1 ring-indigo-500'
                  : activeCategory === category.name 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${category.color}`}></div>
                {category.name}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                 activeCategory === category.name 
                  ? 'bg-slate-700 text-white' 
                  : 'bg-slate-800/50 text-slate-500 group-hover:bg-slate-800 group-hover:text-slate-300'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/50 rounded-lg p-3">
          <p className="text-xs text-slate-400">Armazenamento Local</p>
          <p className="text-sm font-semibold text-slate-200 mt-1">
            {videos.length} vídeos indexados
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;