'use client';

import { useState, useEffect } from 'react';

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (filePath: string) => void;
  baseFolder?: string; // например 'courses'
}

export default function FileManagerModal({ isOpen, onClose, onSelect, baseFolder = '' }: FileManagerModalProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState(baseFolder);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFiles(currentPath);
    }
  }, [isOpen, currentPath]);

  const fetchFiles = async (dir: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/files?path=${encodeURIComponent(dir)}`);
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Failed to load files', error);
    }
    setLoading(false);
  };

  const handleGoBack = () => {
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    setCurrentPath(parentPath);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl flex flex-col h-[80vh]">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Файловый менеджер</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        
        <div className="p-2 border-b border-gray-700 flex items-center gap-2 text-sm text-gray-300">
          <button 
            onClick={handleGoBack}
            disabled={currentPath === '' || currentPath === '/'}
            className="px-2 py-1 bg-gray-700 rounded disabled:opacity-50"
          >
            &#8592; Назад
          </button>
          <span>/{currentPath}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center text-gray-400 p-4">Загрузка...</div>
          ) : (
            <div className="grid grid-cols-4 gap-4 p-2">
              {files.map((file) => (
                <div 
                  key={file.name}
                  onClick={() => {
                    if (file.isDirectory) {
                      setCurrentPath(file.path);
                    } else {
                      onSelect(`https://physmathlab.ru/${file.path}`);
                      onClose();
                    }
                  }}
                  className="cursor-pointer flex flex-col items-center p-2 rounded hover:bg-gray-700 text-center"
                >
                  <div className="text-4xl mb-2">
                    {file.isDirectory ? '📁' : '📄'}
                  </div>
                  <span className="text-xs text-gray-300 break-all">{file.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}