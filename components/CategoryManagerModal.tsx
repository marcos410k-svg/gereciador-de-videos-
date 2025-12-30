import React, { useState } from 'react';
import { Category } from '../types';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { CATEGORY_COLORS } from '../constants';

interface CategoryManagerModalProps {
  categories: Category[];
  onAddCategory: (name: string, color: string) => void;
  onDeleteCategory: (id: string) => void;
  onClose: () => void;
}

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  categories,
  onAddCategory,
  onDeleteCategory,
  onClose
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!newCategoryName.trim()) {
      setError('O nome da categoria não pode ser vazio.');
      return;
    }
    if (categories.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      setError('Já existe uma categoria com este nome.');
      return;
    }
    onAddCategory(newCategoryName.trim(), selectedColor);
    setNewCategoryName('');
    setError('');
  };

  const isProtected = (name: string) => name === 'Sem Categoria';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 animate-in zoom-in duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-lg font-bold text-white">Gerenciar Categorias</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2">
          {categories.map((cat) => (
            <div 
              key={cat.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full ${cat.color} shadow-sm`} />
                <span className="text-slate-200 font-medium">{cat.name}</span>
              </div>
              {!isProtected(cat.name) && (
                <button 
                  onClick={() => onDeleteCategory(cat.id)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Excluir Categoria"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-800/20">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Nova Categoria</h3>
          
          <div className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Nome da categoria..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all outline-none"
              />
              {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            </div>

            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {CATEGORY_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-6 h-6 rounded-full ${color} transition-transform hover:scale-110 flex items-center justify-center ${selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-70 hover:opacity-100'}`}
                  >
                    {selectedColor === color && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={!newCategoryName.trim()}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Categoria
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CategoryManagerModal;