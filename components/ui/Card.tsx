
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`card border-0 shadow-sm ${className}`}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h5 className="card-title mb-0 fw-bold text-dark">{children}</h5>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string; }> = ({ children, className }) => (
    <div className={`card-body ${className || ''}`}>{children}</div>
);

export const CardHeader: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`card-header bg-white border-0 pt-4 px-4 pb-2 d-flex justify-content-between align-items-start ${className || ''}`}>
        {children}
    </div>
);

export default Card;
