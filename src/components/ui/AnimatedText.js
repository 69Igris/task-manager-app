'use client';

import { useEffect, useRef } from 'react';
import { motion, useInView, useAnimation } from 'framer-motion';

// Gradient Text Component - Animated gradient background on text
export function GradientText({ children, className = '', colors = ['#4F46E5', '#7C3AED', '#2563EB'] }) {
  return (
    <span 
      className={`bg-clip-text text-transparent bg-gradient-to-r animate-gradient-x ${className}`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${colors.join(', ')}, ${colors[0]})`,
        backgroundSize: '200% 100%',
      }}
    >
      {children}
    </span>
  );
}

// Split Text Animation - Each character animates in
export function SplitText({ children, className = '', delay = 0 }) {
  const text = String(children);
  
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.03, delayChildren: delay },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 200,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
    },
  };

  return (
    <motion.span
      className={`inline-flex flex-wrap ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {text.split('').map((char, index) => (
        <motion.span key={index} variants={child} className="inline-block">
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

// Blur Text Animation - Text blurs in
export function BlurText({ children, className = '', delay = 0 }) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, filter: 'blur(10px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.span>
  );
}

// Typewriter Effect
export function TypewriterText({ text, className = '', speed = 50 }) {
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      controls.start('visible');
    }
  }, [isInView, controls]);

  return (
    <motion.span
      ref={ref}
      className={`inline-block ${className}`}
      initial="hidden"
      animate={controls}
    >
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1 },
          }}
          transition={{ delay: index * (speed / 1000) }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}

// Counting Number Animation
export function CountingNumber({ value, className = '', duration = 2 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
    >
      {isInView ? (
        <motion.span
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
        >
          <CountUp end={value} duration={duration} />
        </motion.span>
      ) : (
        0
      )}
    </motion.span>
  );
}

// Simple count up implementation
function CountUp({ end, duration }) {
  const ref = useRef(null);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    let startTime;
    const startValue = 0;
    
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const currentValue = Math.floor(progress * (end - startValue) + startValue);
      element.textContent = currentValue;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.textContent = end;
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, duration]);
  
  return <span ref={ref}>0</span>;
}

// Shiny Text Effect
export function ShinyText({ children, className = '' }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="relative z-10">{children}</span>
      <motion.span
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{
          repeat: Infinity,
          repeatDelay: 3,
          duration: 1.5,
          ease: 'easeInOut',
        }}
      />
    </span>
  );
}
