import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmVariant = 'primary', isLoading, requireTyping }) => {
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    if (isOpen) setTypedText('');
  }, [isOpen]);

  const isConfirmDisabled = requireTyping ? typedText !== requireTyping : false;

  const handleConfirm = () => {
    if (isConfirmDisabled) return;
    onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <p className="text-navy-700">{message}</p>

        {requireTyping && (
          <div className="space-y-2">
            <label className="text-sm font-bold text-navy-900 block">
              Please type <span className="bg-navy-100 px-2 py-0.5 rounded text-red-600 select-all">{requireTyping}</span> to confirm:
            </label>
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              className="w-full border-2 border-navy-200 rounded-xl px-4 py-3 focus:border-red-500 outline-none text-center font-bold tracking-wider"
              placeholder={requireTyping}
            />
          </div>
        )}

        <div className="flex gap-3 pt-2 border-t border-navy-100">
          <Button variant="outline" fullWidth onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant={confirmVariant} 
            fullWidth 
            onClick={handleConfirm} 
            isLoading={isLoading}
            disabled={isConfirmDisabled || isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
