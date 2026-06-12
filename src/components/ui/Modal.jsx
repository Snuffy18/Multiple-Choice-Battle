import { useEffect } from 'react';

export function Modal({ open, onClose, children, className = '' }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={`bg-slate-card border border-violet/20 rounded-2xl p-8 shadow-2xl max-w-lg w-full mx-4 animate-slide_in ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
