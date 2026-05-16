import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableSquareProps {
  id: string;
  className?: string;
  children?: React.ReactNode;
  data?: any;
  onClick?: () => void;
}

export const DroppableSquare: React.FC<DroppableSquareProps> = ({ 
  id, 
  className, 
  children, 
  data,
  onClick 
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? 'square--over' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
