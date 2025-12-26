
import React from 'react';

// Added style property to the Card component's interface to support inline styles
interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

// Updated the Card component to apply the optional style prop to the wrapper div
const Card: React.FC<CardProps> = ({ children, className = '', style }) => {
  return (
    <div className={`card border-0 shadow-sm ${className}`} style={style}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <h5 className={`card-title mb-0 fw-bold text-dark ${className || ''}`}>{children}</h5>
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
