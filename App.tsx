import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Plus, Search, UploadCloud, FolderOpen, Trash2, X, CheckSquare, FolderPlus
} from 'lucide-react';
import { VideoFile, Category } from './types';
import { DEFAULT_CATEGORIES, CATEGORY_COLORS } from './constants';
import VideoCard from './components/VideoCard';
import VideoModal from './components/VideoModal';
import Sidebar from './components/Sidebar';
import CategoryManagerModal from './components/CategoryManagerModal';
import { classifySingleVideoMultimodal, classifyVideosByText, extractFrameAsBase64, findSimilarContent, generateVideoPreviews } from './services/geminiService';

const App: React.FC = () => {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizeProgress, setOrganizeProgress] = useState<{current: number, total: number} | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Helper to generate thumbnails AND previews
  const generateThumbnails = async (newVideos: VideoFile[]) => {
    // Process one by one to avoid browser lag with multiple video elements
    for (const video of newVideos) {
      try {
        await new Promise(r => setTimeout(r, 100)); // Small yield
        const { thumbnail, previews } = await generateVideoPreviews(video.url);
        
        setVideos(prev => prev.map(v => v.id === video.id ? { 
            ...v, 
            thumbnail, 
            previewFrames: previews 
        } : v));
      } catch (error) { console.warn(error); }
    }
  };

  const processFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    setLoadingFiles(true);
    const newVideos: VideoFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name.startsWith('.')) continue;
      if (file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        newVideos.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          url,
          categories: [],
          isFavorite: false,
          size: `${sizeMb} MB`,
          addedAt: new Date(),
        });
      }
    }
    setVideos(prev => [...prev, ...newVideos]);
    setLoadingFiles(false);
    
    // Start generating previews in background
    generateThumbnails(newVideos);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const handleAddCategory = (name: string, color: string) => {
    setCategories(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), name, color }]);
  };

  const handleDeleteCategory = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (!cat) return;
    setCategories(prev => prev.filter(c => c.id !== id));
    setVideos(prev => prev.map(v => ({ ...v, categories: v.categories.filter(c => c !== cat.name) })));
    if (activeCategory === cat.name) setActiveCategory('All');
  };

  // Improved Batch Processing with strict typing
  const processVideoBatch = async (videoBatch: VideoFile[], getCurrentCategories: () => Category[]) => {
    const currentCategories = getCurrentCategories();
    const categoryNames = currentCategories.map(c => c.name);

    const promises = videoBatch.map(async (video) => {
      try {
        let result = await classifySingleVideoMultimodal({ id: video.id, name: video.name, url: video.url }, categoryNames);

        if (!result) {
          const textResults = await classifyVideosByText([{ id: video.id, name: video.name }], categoryNames);
          if (textResults && textResults.length > 0) {
            const tr = textResults[0];
            // Normalize data structure
            result = {
                id: tr.id,
                categories: Array.isArray(tr.categories) ? tr.categories : [tr.category || ''],
                reason: tr.reason,
                description: tr.description,
                source: tr.source
            };
          }
        }
        return { videoId: video.id, result };
      } catch (error) {
        return { videoId: video.id, result: null };
      }
    });
    return Promise.all(promises);
  };

  const handleAutoOrganize = async () => {
    const unclassified = videos.filter(v => v.categories.length === 0 || (v.categories.length === 1 && v.categories[0] === 'Sem Categoria'));
    if (unclassified.length === 0) { alert("Todos os vídeos já possuem categorias!"); return; }
    
    setIsOrganizing(true);
    let processedCount = 0;
    setOrganizeProgress({ current: 0, total: unclassified.length });
    
    // BATCH SIZE 1 PARA MÁXIMA SEGURANÇA NA COTA GRATUITA
    const BATCH_SIZE = 1;
    
    for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
      const batch = unclassified.slice(i, i + BATCH_SIZE);
      const results = await processVideoBatch(batch, () => categories);

      for (const { videoId, result } of results) {
        if (result && result.categories && result.categories.length > 0) {
          const suggestedCategories = result.categories.filter(c => c && c.trim() !== '');
          const validCategories: string[] = [];
          const currentCats = [...categories]; 

          for (const catName of suggestedCategories) {
             const cleanName = catName.trim();
             if (!cleanName || cleanName.length < 2 || cleanName === 'Sem Categoria') continue;

             // SMART MATCHING: Verifica duplicatas mesmo se a string não for idêntica
             // Ex: "Lexi" deve dar match em "Lexi Lore"
             const existing = currentCats.find(c => {
                 const cName = c.name.toLowerCase();
                 const nName = cleanName.toLowerCase();
                 return cName === nName || 
                        (cName.includes(nName) && nName.length > 3) || // "Lexi Lore" inclui "Lexi"
                        (nName.includes(cName) && cName.length > 3);    // "Lexi Lore" inclui "Lexi"
             });

             if (!existing) {
                const newCat = { id: Math.random().toString(36).substr(2, 9), name: cleanName, color: CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)] };
                currentCats.push(newCat);
                setCategories(prev => [...prev, newCat]);
                validCategories.push(cleanName);
             } else {
                // Se encontrou similar, usa o nome que JÁ EXISTE no sistema
                if (!validCategories.includes(existing.name)) {
                   validCategories.push(existing.name);
                }
             }
          }

          if (validCategories.length > 0) {
             setVideos(prev => prev.map(v => v.id === videoId ? { ...v, categories: validCategories, description: result!.description, sourceLink: result!.source } : v));
          }
        }
        processedCount++;
        setOrganizeProgress({ current: processedCount, total: unclassified.length });
      }
      
      // DELAY DE 6 SEGUNDOS ENTRE REQUISIÇÕES
      // Isso limita a < 10 requisições por minuto, garantindo segurança na cota de 15 RPM.
      if (i + BATCH_SIZE < unclassified.length) {
          await new Promise(resolve => setTimeout(resolve, 6000));
      }
    }
    setIsOrganizing(false);
    setOrganizeProgress(null);
  };

  const handleToggleCategory = async (id: string, categoryName: string) => {
    // 1. Optimistic Update
    setVideos(prev => prev.map(v => {
      if (v.id !== id) return v;
      const newCategories = v.categories.includes(categoryName)
        ? v.categories.filter(c => c !== categoryName)
        : [...v.categories, categoryName];
      return { ...v, categories: newCategories };
    }));

    const video = videos.find(v => v.id === id);
    if (!video || video.categories.includes(categoryName)) return; 

    // Allow UI to render first
    await new Promise(r => setTimeout(r, 100));

    if (window.confirm(`Procurar "${categoryName}" em outros vídeos da biblioteca automaticamente?`)) {
        setIsOrganizing(true);
        setOrganizeProgress({ current: 0, total: 100 });
        try {
            const candidates = videos.filter(v => v.id !== id && !v.categories.includes(categoryName));
            
            if (candidates.length === 0) { alert("Sem outros vídeos para comparar."); setIsOrganizing(false); return; }

            setOrganizeProgress({ current: 0, total: candidates.length });
            
            const matchedIds = await findSimilarContent(
                { id: video.id, url: video.url, category: categoryName },
                candidates.map(c => ({ id: c.id, url: c.url, name: c.name }))
            );

            if (matchedIds.length > 0) {
                setVideos(prev => prev.map(v => {
                    if (matchedIds.includes(v.id) && !v.categories.includes(categoryName)) {
                        return { ...v, categories: [...v.categories, categoryName] };
                    }
                    return v;
                }));
                alert(`Marcado em +${matchedIds.length} vídeos.`);
            } else {
                alert("Nenhum similar encontrado.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro na busca automática. Verifique sua conexão ou cota de API.");
        } finally {
            setIsOrganizing(false);
            setOrganizeProgress(null);
        }
    }
  };

  const filteredVideos = videos.filter(video => {
    let matchesCategory = false;
    if (activeCategory === 'All') matchesCategory = true;
    else if (activeCategory === 'Favoritos') matchesCategory = video.isFavorite;
    else if (activeCategory === 'Sem Categoria') matchesCategory = video.categories.length === 0 || video.categories.includes('Sem Categoria');
    else matchesCategory = video.categories.includes(activeCategory);
    return matchesCategory && video.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev => prev.size === filteredVideos.length && filteredVideos.length > 0 ? new Set() : new Set(filteredVideos.map(v => v.id)));
  }, [filteredVideos]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      <Sidebar 
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onAutoOrganize={handleAutoOrganize}
        onManageCategories={() => setShowCategoryManager(true)}
        isOrganizing={isOrganizing}
        videos={videos}
      />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-20 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center px-8 shrink-0 z-10">
          {selectedIds.size > 0 ? (
            <div className="flex-1 flex items-center justify-between bg-indigo-500/5 px-4 py-2 rounded-xl border border-indigo-500/20">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedIds(new Set())} className="p-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                <span className="text-white font-medium">{selectedIds.size} selecionados</span>
                <button onClick={handleSelectAll} className="text-sm flex items-center gap-2 text-slate-400 hover:text-white"><CheckSquare className="w-4 h-4" /> Todos</button>
              </div>
              <button onClick={() => {
                  if (window.confirm('Excluir selecionados?')) {
                      setVideos(prev => prev.filter(v => !selectedIds.has(v.id)));
                      setSelectedIds(new Set());
                  }
              }} className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold"><Trash2 className="w-4 h-4" /> Excluir</button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 flex-1">
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                 <button onClick={() => folderInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium">
                  <FolderPlus className="w-4 h-4" /> Pasta
                  <input ref={folderInputRef} type="file" multiple 
                  // @ts-ignore
                  webkitdirectory="" directory="" onChange={handleFileInput} className="hidden" />
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium cursor-pointer">
                  <Plus className="w-4 h-4" /> Vídeos
                  <input type="file" multiple accept="video/*" onChange={handleFileInput} className="hidden" />
                </label>
              </div>
            </>
          )}
        </header>

        {isOrganizing && organizeProgress && (
           <div className="absolute top-20 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur border-b border-indigo-500/30 p-4">
             <div className="max-w-3xl mx-auto">
               <div className="flex justify-between text-sm text-slate-300 mb-2">
                  <span>{organizeProgress.total === 100 ? "Buscando pessoa..." : "Organizando em Modo Seguro (Cota Gratuita)..."}</span>
                  <span>{organizeProgress.current > 0 ? `${organizeProgress.current}/${organizeProgress.total}` : ''}</span>
               </div>
               <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: organizeProgress.total === 100 ? '100%' : `${(organizeProgress.current / organizeProgress.total) * 100}%` }} />
               </div>
               <p className="text-xs text-slate-500 mt-2 text-center">Processando lentamente (6s por vídeo) para não exceder o limite da API.</p>
             </div>
           </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 relative" onDragOver={(e) => {e.preventDefault(); setIsDragging(true)}} onDragLeave={(e) => {e.preventDefault(); setIsDragging(false)}} onDrop={(e) => {e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files)}}>
          {isDragging && <div className="absolute inset-0 z-50 bg-indigo-500/10 backdrop-blur-sm border-4 border-indigo-500 border-dashed m-4 rounded-3xl flex items-center justify-center pointer-events-none"><UploadCloud className="w-24 h-24 text-indigo-400" /></div>}
          
          {loadingFiles && <div className="absolute top-0 left-0 right-0 p-2 bg-indigo-600/20 text-indigo-200 text-center text-sm font-medium z-20">Processando...</div>}

          {videos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
              <FolderOpen className="w-16 h-16 text-slate-600 mb-4" />
              <h2 className="text-xl font-bold text-slate-300">Biblioteca Vazia</h2>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
              {filteredVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onPlay={setSelectedVideo}
                  onDelete={handleDeleteCategory ? (id) => setVideos(p => p.filter(v => v.id !== id)) : () => {}} // Simple delete for now in grid
                  onToggleCategory={handleToggleCategory}
                  categories={categories.map(c => c.name)}
                  isSelected={selectedIds.has(video.id)}
                  onToggleSelect={(id) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                  disableHover={!!selectedVideo}
                  onRename={(id, name) => setVideos(p => p.map(v => v.id === id ? { ...v, name } : v))}
                  onToggleFavorite={(id) => setVideos(p => p.map(v => v.id === id ? { ...v, isFavorite: !v.isFavorite } : v))}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      {showCategoryManager && <CategoryManagerModal categories={categories} onAddCategory={handleAddCategory} onDeleteCategory={handleDeleteCategory} onClose={() => setShowCategoryManager(false)} />}
    </div>
  );
};
export default App;