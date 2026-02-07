'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';

// 3D Tilt Card
export function TiltCard({ children, className = '' }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateY,
        rotateX,
        transformStyle: "preserve-3d",
      }}
      className={`${className}`}
    >
      <div style={{ transform: "translateZ(75px)", transformStyle: "preserve-3d" }}>
        {children}
      </div>
    </motion.div>
  );
}

// Spotlight Card
export function SpotlightCard({ children, className = '' }) {
  const divRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  return (
    <motion.div
      ref={divRef}
      onMouseMove={handleMouseMove}
      className={`relative overflow-hidden ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) => `radial-gradient(600px circle at ${x}px ${y}px, rgba(99, 102, 241, 0.15), transparent 40%)`
          ),
        }}
      />
      {children}
    </motion.div>
  );
}

// Glow Card
export function GlowCard({ children, className = '', glowColor = 'indigo' }) {
  const colors = {
    indigo: 'before:from-indigo-500/20 before:via-purple-500/20 before:to-pink-500/20',
    blue: 'before:from-blue-500/20 before:via-cyan-500/20 before:to-teal-500/20',
    green: 'before:from-green-500/20 before:via-emerald-500/20 before:to-teal-500/20',
    purple: 'before:from-purple-500/20 before:via-pink-500/20 before:to-rose-500/20',
  };

  return (
    <motion.div
      className={`relative group ${className}`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className={`absolute -inset-0.5 bg-gradient-to-r rounded-2xl blur opacity-0 group-hover:opacity-75 transition duration-500 ${colors[glowColor]}`} />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

// Flip Card
export function FlipCard({ front, back, className = '' }) {
  return (
    <div className={`group perspective-1000 ${className}`}>
      <motion.div
        className="relative w-full h-full transition-transform duration-500 transform-style-preserve-3d group-hover:rotate-y-180"
        initial={false}
      >
        <div className="absolute w-full h-full backface-hidden">
          {front}
        </div>
        <div className="absolute w-full h-full backface-hidden rotate-y-180">
          {back}
        </div>
      </motion.div>
    </div>
  );
}

// Hover Lift Card
export function HoverLiftCard({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      whileHover={{ 
        y: -8, 
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

// Border Gradient Card
export function BorderGradientCard({ children, className = '' }) {
  return (
    <div className={`relative p-[2px] rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 ${className}`}>
      <div className="bg-white rounded-2xl h-full">
        {children}
      </div>
    </div>
  );
}
