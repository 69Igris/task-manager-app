'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

// Animated Progress Bar
export function AnimatedProgress({ value, max = 100, className = '', color = 'blue' }) {
  const percentage = (value / max) * 100;
  const colors = {
    blue: 'from-blue-500 to-indigo-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    orange: 'from-orange-500 to-red-500',
  };

  return (
    <div className={`w-full h-2 bg-gray-200 rounded-full overflow-hidden ${className}`}>
      <motion.div
        className={`h-full bg-gradient-to-r ${colors[color]} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </div>
  );
}

// Animated Checkbox
export function AnimatedCheckbox({ checked, onChange, className = '' }) {
  return (
    <motion.button
      className={`relative w-6 h-6 rounded-md border-2 transition-colors ${
        checked ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
      } ${className}`}
      onClick={() => onChange(!checked)}
      whileTap={{ scale: 0.9 }}
    >
      <AnimatePresence>
        {checked && (
          <motion.svg
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 w-full h-full text-white p-1"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <motion.path
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3 }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// Animated Toggle Switch
export function AnimatedToggle({ enabled, onChange, className = '' }) {
  return (
    <motion.button
      className={`relative w-14 h-8 rounded-full transition-colors ${
        enabled ? 'bg-blue-500' : 'bg-gray-300'
      } ${className}`}
      onClick={() => onChange(!enabled)}
    >
      <motion.div
        className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
        animate={{ left: enabled ? '1.75rem' : '0.25rem' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  );
}

// Pulse Indicator
export function PulseIndicator({ color = 'green', size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };
  const colors = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <span className={`relative inline-flex ${className}`}>
      <span className={`${sizes[size]} ${colors[color]} rounded-full`} />
      <motion.span
        className={`absolute inline-flex h-full w-full rounded-full ${colors[color]} opacity-75`}
        animate={{ scale: [1, 1.5], opacity: [0.75, 0] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </span>
  );
}

// Animated Badge
export function AnimatedBadge({ children, color = 'blue', className = '' }) {
  const colors = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  return (
    <motion.span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color]} ${className}`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
    >
      {children}
    </motion.span>
  );
}

// Skeleton Loader
export function SkeletonLoader({ className = '', variant = 'text' }) {
  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <motion.div
      className={`bg-gray-200 ${variants[variant]} ${className}`}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// Animated Tabs
export function AnimatedTabs({ tabs, activeTab, onChange, className = '' }) {
  return (
    <div className={`flex bg-gray-100 rounded-lg p-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === tab.id ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-white rounded-md shadow-sm"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

// Notification Dot
export function NotificationDot({ count, className = '' }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className={`absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ${className}`}
        >
          {count > 99 ? '99+' : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

// Animated Tooltip
export function AnimatedTooltip({ children, content, className = '' }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg whitespace-nowrap z-50"
          >
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
