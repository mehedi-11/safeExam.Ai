import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content max-w-lg w-full relative">
        <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b border-gray-150">
          <h3 className="text-lg font-semibold text-dark-900">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-dark-900 hover:bg-gray-100 p-1.5 rounded-lg smooth-transition"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
}
