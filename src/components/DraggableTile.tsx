import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Tile } from '../types';

interface DraggableTileProps {
  tile: Tile;
  isPlaced?: boolean;
  data?: any;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
}

export const DraggableTile: React.FC<DraggableTileProps> = ({ 
  tile, 
  isPlaced, 
  data,
  className,
  style: customStyle,
  onClick,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tile.id,
    data: { tile, isPlaced, ...data }
  });

  const style = {
    ...customStyle,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : undefined,
    touchAction: 'none', // Critical for mobile drag
  };

  // Combine listeners with our custom events
  const combinedListeners = {
    ...listeners,
    onMouseDown: (e: React.MouseEvent) => {
      listeners?.onMouseDown?.(e);
      onMouseDown?.(e);
    },
    onMouseUp: (e: React.MouseEvent) => {
      listeners?.onMouseUp?.(e);
      onMouseUp?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      listeners?.onMouseLeave?.(e);
      onMouseLeave?.(e);
    },
    onTouchStart: (e: React.TouchEvent) => {
      listeners?.onTouchStart?.(e);
      onTouchStart?.(e);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      listeners?.onTouchEnd?.(e);
      onTouchEnd?.(e);
    },
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...combinedListeners}
      {...attributes}
      className={`${className} ${isDragging ? 'tile--dragging' : ''}`}
      onClick={(e) => {
        // Only trigger click if we weren't dragging
        if (!isDragging && onClick) {
          onClick();
        }
      }}
    >
      <span className="tile-char">
        {tile.isBlank ? tile.assignedChar || '★' : tile.char}
      </span>
      {tile.points > 0 && <span className="tile-points">{tile.points}</span>}
    </div>
  );
};
