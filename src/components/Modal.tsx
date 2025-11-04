import React from 'react';
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
}
export function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  cancelText = 'Go back',
  confirmText = 'Confirm'
}: ModalProps) {
  if (!isOpen) return null;
  /* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */
  return <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" role="presentation" aria-hidden="true" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
        <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-[fadeIn_0.2s_ease-out]" onClick={event => event.stopPropagation()}>
        <h3 id="modal-title" className="text-xl font-serif font-semibold text-stone-900 mb-2">
          {title}
        </h3>
        <p className="text-stone-600 mb-6">{message}</p>
        <div className="flex flex-col sm:flex-row-reverse gap-3 sm:gap-4">
          <button onClick={onConfirm} className="bg-[#6B1F1F] hover:bg-[#5a1a1a] text-white py-2 px-4 rounded-md transition-colors">
            {confirmText}
          </button>
          <button onClick={onClose} className="border border-stone-300 text-stone-700 hover:bg-stone-100 py-2 px-4 rounded-md transition-colors">
            {cancelText}
          </button>
        </div>
        </div>
      </div>
    </>;
  /* eslint-enable jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */
}
