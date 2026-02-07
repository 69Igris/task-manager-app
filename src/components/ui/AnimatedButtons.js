'use client';

import { motion } from 'framer-motion';

// Magnetic Button - Follows cursor slightly
export function MagneticButton({ children, className = '', onClick, disabled = false }) {
  return (
    <motion.button
      className={className}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.button>
  );
}

// Shiny Button with gradient animation
export function ShinyButton({ children, className = '', onClick, disabled = false }) {
  return (
    <motion.button
      className={`relative overflow-hidden ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="relative z-10">{children}</span>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
        initial={{ x: '-100%' }}
        whileHover={{ x: '200%' }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      />
    </motion.button>
  );
}

// Ripple Button
export function RippleButton({ children, className = '', onClick, disabled = false }) {
  const handleClick = (e) => {
    const button = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - button.offsetLeft - radius}px`;
    circle.style.top = `${e.clientY - button.offsetTop - radius}px`;
    circle.classList.add('ripple-effect');
    
    const ripple = button.getElementsByClassName('ripple-effect')[0];
    if (ripple) {
      ripple.remove();
    }
    
    button.appendChild(circle);
    
    setTimeout(() => circle.remove(), 600);
    
    if (onClick) onClick(e);
  };

  return (
    <button
      className={`relative overflow-hidden ${className}`}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
      <style jsx>{`
        .ripple-effect {
          position: absolute;
          border-radius: 50%;
          transform: scale(0);
          animation: ripple 600ms linear;
          background-color: rgba(255, 255, 255, 0.3);
        }
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
    </button>
  );
}

// Spotlight Button
export function SpotlightButton({ children, className = '', onClick, disabled = false }) {
  return (
    <motion.button
      className={`relative overflow-hidden group ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="relative z-10">{children}</span>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-spotlight" />
    </motion.button>
  );
}

// Glow Button
export function GlowButton({ children, className = '', onClick, disabled = false, glowColor = 'blue' }) {
  const glowColors = {
    blue: 'shadow-blue-500/50 hover:shadow-blue-500/75',
    purple: 'shadow-purple-500/50 hover:shadow-purple-500/75',
    green: 'shadow-green-500/50 hover:shadow-green-500/75',
    red: 'shadow-red-500/50 hover:shadow-red-500/75',
    indigo: 'shadow-indigo-500/50 hover:shadow-indigo-500/75',
  };

  return (
    <motion.button
      className={`shadow-lg transition-shadow duration-300 ${glowColors[glowColor]} ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.03, boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)' }}
      whileTap={{ scale: 0.97 }}
    >
      {children}
    </motion.button>
  );
}
