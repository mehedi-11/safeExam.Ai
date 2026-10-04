import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }) {
  if (!isOpen) return null;

  const modalContent = (
    <div className="modal-backdrop">
      <div className={`modal-content ${maxWidth} w-full relative`}>
        <div className="flex justify-between items-center bg-dark-900 px-6 py-4 border-b border-dark-700">
          <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-100 hover:bg-dark-700 p-1.5 rounded-lg smooth-transition"
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

  return createPortal(modalContent, document.body);
}
