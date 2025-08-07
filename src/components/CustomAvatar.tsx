import React from 'react';
import {
  User, Circle, Square, Triangle, Star, Heart, Cloud, Sun, Moon,
  Bell, Zap, Feather, Anchor, Award, Battery, Bike, Book,
  Briefcase, Camera, Car, Cat, Coffee, Compass, Crown, Diamond
} from 'lucide-react';

const AVATAR_SHAPES = {
  user: User,
  circle: Circle,
  square: Square,
  triangle: Triangle,
  star: Star,
  heart: Heart,
  cloud: Cloud,
  sun: Sun,
  moon: Moon,
  bell: Bell,
  zap: Zap,
  feather: Feather,
  anchor: Anchor,
  award: Award,
  battery: Battery,
  bike: Bike,
  book: Book,
  briefcase: Briefcase,
  camera: Camera,
  car: Car,
  cat: Cat,
  coffee: Coffee,
  compass: Compass,
  crown: Crown,
  diamond: Diamond,
};

interface CustomAvatarProps {
  shape?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function CustomAvatar({
  shape = 'user',
  foregroundColor = '#4f46e5',
  backgroundColor = '#e0e7ff',
  size = 'medium',
  className = ''
}: CustomAvatarProps) {
  const getAvatarSize = () => {
    switch (size) {
      case 'small': return 'h-8 w-8';
      case 'large': return 'h-20 w-20';
      default: return 'h-10 w-10';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 'h-4 w-4';
      case 'large': return 'h-10 w-10';
      default: return 'h-5 w-5';
    }
  };

  const IconComponent = AVATAR_SHAPES[shape as keyof typeof AVATAR_SHAPES] || User;

  return (
    <div
      className={`${getAvatarSize()} rounded-full flex items-center justify-center ${className}`}
      style={{ backgroundColor }}
    >
      <IconComponent 
        className={getIconSize()}
        style={{ color: foregroundColor }}
      />
    </div>
  );
}