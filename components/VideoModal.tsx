import React from 'react';
import { VideoFile } from '../types';
import { X, Download, Share2, ExternalLink, Info } from 'lucide-react';

interface VideoModalProps {
  video: VideoFile | null;
  onClose: () => void;
}

const VideoModal: React.FC<VideoModalProps> = ({ video, onClose }) => {
  if (!video) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <h2 className="text-lg font-bold text-white truncate pr-8">{video.name}</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="aspect-video bg-black flex items-center justify-center shrink-0">
          <video 
            src={video.url} 
            controls 
            autoPlay 
            className="max-h-[60vh] w-full object-contain"
          />
        </div>
        
        <div className="p-6 bg-slate-900/50 flex flex-col gap-6 overflow-y-auto">
          {/* Metadata Row */}
          <div className="flex flex-wrap gap-8 items-start">
             <div className="flex-1 min-w-[200px]">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Categorias</p>
              <div className="flex flex-wrap gap-2">
                {video.categories.length > 0 ? video.categories.map(cat => (
                  <span key={cat} className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-sm font-medium">
                    {cat}
                  </span>
                )) : (
                   <span className="text-slate-500 text-sm">Sem categoria</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Tamanho</p>
              <p className="text-sm text-slate-300 font-medium">{video.size}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Adicionado em</p>
              <p className="text-sm text-slate-300 font-medium">{new Date(video.addedAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* AI Description & Source */}
          {(video.description || video.sourceLink) && (
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-200">Sobre este vídeo</h3>
              </div>
              
              {video.description && (
                <p className="text-sm text-slate-400 leading-relaxed mb-3">
                  {video.description}
                </p>
              )}

              {video.sourceLink && (
                 <a 
                  href={video.sourceLink.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 hover:underline transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Fonte: {video.sourceLink.name}
                </a>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 mt-auto">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 transition-all font-medium text-sm">
              <Download className="w-4 h-4" /> Download
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all font-medium text-sm shadow-lg shadow-indigo-500/20">
              <Share2 className="w-4 h-4" /> Compartilhar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;