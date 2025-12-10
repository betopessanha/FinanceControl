
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size }) => {
  if (!isOpen) return null;

  return (
    <>
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1} role="dialog" onClick={onClose}>
        <div className={`modal-dialog modal-dialog-centered ${size ? `modal-${size}` : ''}`} role="document" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content shadow">
            <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold">{title}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
            </div>
            <div className="modal-body p-4">
                {children}
            </div>
            </div>
        </div>
        </div>
        <div className="modal-backdrop fade show"></div>
    </>
  );
};

export default Modal;
