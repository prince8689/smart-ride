import React from 'react';

const Card = ({ children, variant = 'default', className = '', ...props }) => {
  const baseStyles = 'rounded-2xl transition-all duration-200';
  
  const variants = {
    default: 'bg-white shadow-card p-6',
    hover: 'bg-white shadow-card hover:shadow-card-hover hover:-translate-y-1 p-6 cursor-pointer',
    flat: 'bg-navy-50 border border-navy-100 p-6',
  };

  const classes = `${baseStyles} ${variants[variant]} ${className}`;

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;
