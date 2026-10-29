import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, HelpCircle, X } from 'lucide-react';

const AlertContext = createContext(null);

let globalShowAlert = null;
let globalShowConfirm = null;

export const customAlert = (message, title = 'Notification', type = 'info') => {
  if (globalShowAlert) {
    return globalShowAlert(message, title, type);
  } else {
    console.warn('AlertProvider not mounted yet:', message);
  }
};

export const customConfirm = (message, options = {}) => {
  if (globalShowConfirm) {
    return globalShowConfirm(message, options);
  }
  return Promise.resolve(false);
};

export const AlertProvider = ({ children }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info', // 'success' | 'error' | 'warning' | 'info' | 'danger'
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    isConfirm: false,
  });

  const resolverRef = useRef(null);

  const closeModal = useCallback(() => {
    setModal((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  const handleConfirm = useCallback(() => {
    setModal((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const showAlert = useCallback((message, title = 'Notification', type = 'info') => {
    let detectedType = type;
    let detectedTitle = title;
    const msgStr = typeof message === 'string' ? message : JSON.stringify(message);

    if (type === 'info') {
      if (/success|deleted|updated|added|created|saved|published/i.test(msgStr)) {
        detectedType = 'success';
        if (title === 'Notification') detectedTitle = 'Success';
      } else if (/error|failed|cannot|invalid|wrong|blocked|denied/i.test(msgStr)) {
        detectedType = 'error';
        if (title === 'Notification') detectedTitle = 'Notice';
      }
    }

    setModal({
      isOpen: true,
      type: detectedType,
      title: detectedTitle,
      message: msgStr,
      confirmText: 'OK',
      cancelText: '',
      isConfirm: false,
    });
  }, []);

  const showConfirm = useCallback((message, options = {}) => {
    const {
      title = 'Please Confirm',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      type = 'warning'
    } = typeof options === 'string' ? { title: options } : options;

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setModal({
        isOpen: true,
        type,
        title,
        message: String(message || ''),
        confirmText,
        cancelText,
        isConfirm: true,
      });
    });
  }, []);

  useEffect(() => {
    globalShowAlert = showAlert;
    globalShowConfirm = showConfirm;

    // Intercept native browser alert
    const nativeAlert = window.alert;
    window.alert = (msg) => {
      showAlert(msg);
    };

    return () => {
      window.alert = nativeAlert;
      globalShowAlert = null;
      globalShowConfirm = null;
    };
  }, [showAlert, showConfirm]);

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        showConfirm,
        showSuccess: (m, t) => showAlert(m, t || 'Success', 'success'),
        showError: (m, t) => showAlert(m, t || 'Error', 'error'),
        showWarning: (m, t) => showAlert(m, t || 'Warning', 'warning'),
      }}
    >
      {children}

      {/* Modern Pop-up Modal */}
      {modal.isOpen && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={modal.isConfirm ? closeModal : closeModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Body */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                {/* Icon Container */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                  modal.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                  modal.type === 'error' ? 'bg-rose-100 text-rose-600' :
                  modal.type === 'danger' ? 'bg-red-100 text-red-600' :
                  modal.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                  'bg-indigo-100 text-indigo-600'
                }`}>
                  {modal.type === 'success' && <CheckCircle2 size={26} strokeWidth={2.2} />}
                  {(modal.type === 'error' || modal.type === 'danger') && <AlertTriangle size={26} strokeWidth={2.2} />}
                  {modal.type === 'warning' && (modal.isConfirm ? <HelpCircle size={26} strokeWidth={2.2} /> : <AlertCircle size={26} strokeWidth={2.2} />)}
                  {modal.type === 'info' && <Info size={26} strokeWidth={2.2} />}
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900 tracking-tight">
                      {modal.title}
                    </h3>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-line font-normal">
                    {modal.message}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="bg-gray-50/90 px-6 py-3.5 border-t border-gray-100 flex items-center justify-end gap-2.5">
              {modal.isConfirm ? (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition shadow-sm cursor-pointer"
                  >
                    {modal.cancelText || 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className={`px-4.5 py-2 text-xs font-bold text-white rounded-xl transition shadow-sm cursor-pointer ${
                      modal.type === 'danger' || modal.type === 'error' 
                        ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' 
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                    }`}
                  >
                    {modal.confirmText || 'Confirm'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-xl transition shadow-sm cursor-pointer"
                >
                  {modal.confirmText || 'OK'}
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
    return {
      showAlert: customAlert,
      showConfirm: customConfirm,
      showSuccess: (m, t) => customAlert(m, t, 'success'),
      showError: (m, t) => customAlert(m, t, 'error'),
      showWarning: (m, t) => customAlert(m, t, 'warning'),
    };
  }
  return context;
};

export default AlertContext;
