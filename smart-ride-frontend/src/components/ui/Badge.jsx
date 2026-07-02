import React from 'react';

const Badge = ({ children, color = 'gray', size = 'sm', className = '' }) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full';
  
  const colors = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
    primary: 'bg-primary-100 text-primary-800',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  const classes = `${baseStyles} ${colors[color] || colors.gray} ${sizes[size]} ${className}`;

  return (
    <span className={classes}>
      {children}
    </span>
  );
};

export default Badge;
