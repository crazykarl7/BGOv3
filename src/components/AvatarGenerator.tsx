import React, { useState, useEffect } from 'react';
import {
  User, Circle, Square, Triangle, Star, Heart, Cloud, Sun, Moon,
  Bell, Zap, Feather, Anchor, Award, Battery, Bike, Book,
  Briefcase, Camera, Car, Cat, Coffee, Compass, Crown, Diamond
} from 'lucide-react';

const AVATAR_SHAPES = [
  { name: 'user', icon: User, label: 'User' },
  { name: 'circle', icon: Circle, label: 'Circle' },
  { name: 'square', icon: Square, label: 'Square' },
  { name: 'triangle', icon: Triangle, label: 'Triangle' },
  { name: 'star', icon: Star, label: 'Star' },
  { name: 'heart', icon: Heart, label: 'Heart' },
  { name: 'cloud', icon: Cloud, label: 'Cloud' },
  { name: 'sun', icon: Sun, label: 'Sun' },
  { name: 'moon', icon: Moon, label: 'Moon' },
  { name: 'bell', icon: Bell, label: 'Bell' },
  { name: 'zap', icon: Zap, label: 'Lightning' },
  { name: 'feather', icon: Feather, label: 'Feather' },
  { name: 'anchor', icon: Anchor, label: 'Anchor' },
  { name: 'award', icon: Award, label: 'Award' },
  { name: 'battery', icon: Battery, label: 'Battery' },
  { name: 'bike', icon: Bike, label: 'Bike' },
  { name: 'book', icon: Book, label: 'Book' },
  { name: 'briefcase', icon: Briefcase, label: 'Briefcase' },
  { name: 'camera', icon: Camera, label: 'Camera' },
  { name: 'car', icon: Car, label: 'Car' },
  { name: 'cat', icon: Cat, label: 'Cat' },
  { name: 'coffee', icon: Coffee, label: 'Coffee' },
  { name: 'compass', icon: Compass, label: 'Compass' },
  { name: 'crown', icon: Crown, label: 'Crown' },
  { name: 'diamond', icon: Diamond, label: 'Diamond' },
];

interface AvatarGeneratorProps {
  initialShape?: string;
  initialForegroundColor?: string;
  initialBackgroundColor?: string;
  onChange: (shape: string, foregroundColor: string, backgroundColor: string) => void;
  size?: 'small' | 'medium' | 'large';
}

export default function AvatarGenerator({
  initialShape = 'user',
  initialForegroundColor = '#4f46e5',
  initialBackgroundColor = '#e0e7ff',
  onChange,
  size = 'medium'
}: AvatarGeneratorProps) {
  const [selectedShape, setSelectedShape] = useState(initialShape);
  const [foregroundColor, setForegroundColor] = useState(initialForegroundColor);
  const [backgroundColor, setBackgroundColor] = useState(initialBackgroundColor);

  useEffect(() => {
    setSelectedShape(initialShape);
    setForegroundColor(initialForegroundColor);
    setBackgroundColor(initialBackgroundColor);
  }, [initialShape, initialForegroundColor, initialBackgroundColor]);

  useEffect(() => {
    onChange(selectedShape, foregroundColor, backgroundColor);
  }, [selectedShape, foregroundColor, backgroundColor, onChange]);

  const handleShapeChange = (shapeName: string) => {
    setSelectedShape(shapeName);
  };

  const handleForegroundColorChange = (color: string) => {
    setForegroundColor(color);
  };

  const handleBackgroundColorChange = (color: string) => {
    setBackgroundColor(color);
  };

  const getSelectedIcon = () => {
    const shape = AVATAR_SHAPES.find(s => s.name === selectedShape);
    return shape ? shape.icon : User;
  };

  const getAvatarSize = () => {
    switch (size) {
      case 'small': return 'h-8 w-8';
      case 'large': return 'h-20 w-20';
      default: return 'h-16 w-16';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 'h-4 w-4';
      case 'large': return 'h-10 w-10';
      default: return 'h-8 w-8';
    }
  };

  const SelectedIcon = getSelectedIcon();

  return (
    <div className="space-y-6">
      {/* Avatar Preview */}
      <div className="flex items-center space-x-4">
        <div
          className={`${getAvatarSize()} rounded-full flex items-center justify-center`}
          style={{ backgroundColor }}
        >
          <SelectedIcon 
            className={getIconSize()}
            style={{ color: foregroundColor }}
          />
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-900">Avatar Preview</h3>
          <p className="text-xs text-gray-500">
            {AVATAR_SHAPES.find(s => s.name === selectedShape)?.label || 'User'}
          </p>
        </div>
      </div>

      {/* Shape Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Choose Shape
        </label>
        <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
          {AVATAR_SHAPES.map((shape) => {
            const IconComponent = shape.icon;
            return (
              <button
                key={shape.name}
                type="button"
                onClick={() => handleShapeChange(shape.name)}
                className={`p-2 rounded-lg border-2 transition-colors ${
                  selectedShape === shape.name
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                title={shape.label}
              >
                <IconComponent className="h-6 w-6 mx-auto text-gray-600" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Icon Color
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={foregroundColor}
              onChange={(e) => handleForegroundColorChange(e.target.value)}
              className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={foregroundColor}
              onChange={(e) => handleForegroundColorChange(e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="#4f46e5"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Background Color
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => handleBackgroundColorChange(e.target.value)}
              className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={backgroundColor}
              onChange={(e) => handleBackgroundColorChange(e.target.value)}
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="#e0e7ff"
            />
          </div>
        </div>
      </div>
    </div>
  );
}