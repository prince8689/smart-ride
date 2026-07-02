import React from 'react';
import { generateAvatarColor, getInitials } from '../../utils/helpers';

const Avatar = ({ src, name, size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const commonClasses = `inline-flex items-center justify-center rounded-full flex-shrink-0 ${sizes[size]} ${className}`;

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={`${commonClasses} object-cover`}
      />
    );
  }

  const bgColor = generateAvatarColor(name);

  return (
    <div
      className={`${commonClasses} text-white font-medium`}
      style={{ backgroundColor: bgColor }}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
