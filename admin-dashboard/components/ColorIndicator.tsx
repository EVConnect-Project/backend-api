import React from 'react';

interface ColorIndicatorProps {
  color: string;
}

export const ColorIndicator: React.FC<ColorIndicatorProps> = ({ color }) => {
  return (
    <div
      className="w-3 h-3 rounded-full color-indicator"
      data-color={color}
    />
  );
};
