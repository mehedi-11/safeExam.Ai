import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, Trash2, X } from 'lucide-react';

const AlertContext = createContext(null);

export const AlertProvider = ({ children }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info', // 'success' | 'error' | 'warning' | 'info' | 'confirm'
    confirmText: 'OK',
    cancelText: 'Cancel',
    isDanger: false,
    resolve: null
  });

  // Close and cleanup
  const handleClose = useCallback((result = false) => {
    setModal(prev => {
      if (prev.resolve) {
        prev.resolve(result);
      }
      return { ...prev, isOpen: false, resolve: null };
    });
  }, []);

  // Keyboard shortcut listener (ESC to cancel, ENTER to confirm)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!modal.isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      } else if (e.key === 'Enter' && modal.type !== 'confirm') {
        e.preventDefault();
        handleClose(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modal.isOpen, modal.type, handleClose]);

  // Show Alert (info, success, error, warning)
  const showAlert = useCallback(({ title, message, type = 'info', confirmText = 'OK' }) => {
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        title: title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Notice'),
        message: message || '',
        type,
        confirmText,
        cancelText: '',
        isDanger: false,
        resolve
      });
    });
  }, []);

  // Quick helper methods
  const showSuccess = useCallback((message, title = 'Success') => showAlert({ title, message, type: 'success' }), [showAlert]);
  const showError = useCallback((message, title = 'Error') => showAlert({ title, message, type: 'error' }), [showAlert]);
  const showWarning = useCallback((message, title = 'Warning') => showAlert({ title, message, type: 'warning' }), [showAlert]);
  const showInfo = useCallback((message, title = 'Notice') => showAlert({ title, message, type: 'info' }), [showAlert]);

  // Show Confirmation Modal (e.g., delete confirmation)
  const showConfirm = useCallback(({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDanger = false
  }) => {
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        title,
        message,
        type: 'confirm',
        confirmText,
        cancelText,
        isDanger,
        resolve
      });
    });
  }, []);

  // Global window.alert and window.customConfirm interception
  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (msg) => {
      showAlert({
        title: 'System Notice',
        message: String(msg || ''),
        type: 'info'
      });
    };

    window.customConfirm = (message, title = 'Confirm Action', isDanger = true) => {
      return showConfirm({
        title,
        message,
        confirmText: isDanger ? 'Delete' : 'Confirm',
        cancelText: 'Cancel',
        isDanger
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showAlert, showConfirm]);

  // Get icon and color theme based on type
  const getTheme = () => {
    switch (modal.type) {
      case 'success':
        return {
          icon: <CheckCircle className="w-8 h-8 text-emerald-600" />,
          bg: 'bg-emerald-50 border-emerald-100',
          titleColor: 'text-emerald-950',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
        };
      case 'error':
        return {
          icon: <XCircle className="w-8 h-8 text-rose-600" />,
          bg: 'bg-rose-50 border-rose-100',
          titleColor: 'text-rose-950',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-8 h-8 text-amber-600" />,
          bg: 'bg-amber-50 border-amber-100',
          titleColor: 'text-amber-950',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20'
        };
      case 'confirm':
        return {
          icon: modal.isDanger ? <Trash2 className="w-8 h-8 text-rose-600" /> : <AlertTriangle className="w-8 h-8 text-amber-600" />,
          bg: modal.isDanger ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100',
          titleColor: modal.isDanger ? 'text-rose-950' : 'text-gray-900',
          confirmBtn: modal.isDanger ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/25' : 'bg-gray-900 hover:bg-black text-white'
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-8 h-8 text-indigo-600" />,
          bg: 'bg-indigo-50 border-indigo-100',
          titleColor: 'text-gray-900',
          confirmBtn: 'bg-gray-900 hover:bg-black text-white shadow-gray-900/20'
        };
    }
  };

  const theme = getTheme();

  return (
    <AlertContext.Provider value={{ showAlert, showSuccess, showError, showWarning, showInfo, showConfirm }}>
      {children}

      {/* Modern Backdrop & Popup Modal */}
      {modal.isOpen && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm transition-opacity duration-200 animate-fade-in"
          onClick={() => handleClose(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 transform transition-all scale-100 animate-scale-up relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Cross Button */}
            <button
              onClick={() => handleClose(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>

            {/* Icon Header */}
            <div className="flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border mb-4 shadow-sm ${theme.bg}`}>
                {theme.icon}
              </div>

              {/* Title */}
              <h3 className={`text-xl font-bold tracking-tight ${theme.titleColor}`}>
                {modal.title}
              </h3>

              {/* Message */}
              <div className="text-sm text-gray-600 mt-2.5 leading-relaxed font-normal whitespace-pre-line max-h-60 overflow-y-auto px-1">
                {modal.message}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center gap-3">
              {modal.type === 'confirm' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleClose(false)}
                    className="flex-1 py-2.5 px-4 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition duration-150 cursor-pointer"
                  >
                    {modal.cancelText || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleClose(true)}
                    className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-xl shadow-md transition duration-150 cursor-pointer ${theme.confirmBtn}`}
                  >
                    {modal.confirmText || 'Confirm'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  className={`w-full py-2.5 px-4 text-sm font-semibold rounded-xl shadow-md transition duration-150 cursor-pointer ${theme.confirmBtn}`}
                >
                  {modal.confirmText || 'Got it'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    // Graceful fallback if used outside Provider
    return {
      showAlert: ({ message }) => { window.alert(message); return Promise.resolve(); },
      showSuccess: (msg) => { window.alert(msg); return Promise.resolve(); },
      showError: (msg) => { window.alert(msg); return Promise.resolve(); },
      showWarning: (msg) => { window.alert(msg); return Promise.resolve(); },
      showInfo: (msg) => { window.alert(msg); return Promise.resolve(); },
      showConfirm: ({ message }) => Promise.resolve(window.confirm(message))
    };
  }
  return context;
};
