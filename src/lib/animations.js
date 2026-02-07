// Framer Motion Animation Variants and Utilities
// Reusable animation configurations for consistent UI animations

// ============ PAGE TRANSITIONS ============
export const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.3 }
  }
};

// ============ FADE ANIMATIONS ============
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};

export const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  exit: { opacity: 0, y: 20 }
};

export const fadeInDown = {
  initial: { opacity: 0, y: -30 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  },
  exit: { opacity: 0, y: -20 }
};

export const fadeInScale = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

// ============ SLIDE ANIMATIONS ============
export const slideInFromRight = {
  initial: { x: '100%', opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: { type: "spring", damping: 25, stiffness: 200 }
  },
  exit: { 
    x: '100%', 
    opacity: 0,
    transition: { duration: 0.3 }
  }
};

export const slideInFromLeft = {
  initial: { x: '-100%', opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: { type: "spring", damping: 25, stiffness: 200 }
  },
  exit: { x: '-100%', opacity: 0 }
};

export const slideInFromBottom = {
  initial: { y: '100%', opacity: 0 },
  animate: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring", damping: 30, stiffness: 300 }
  },
  exit: { 
    y: '100%', 
    opacity: 0,
    transition: { duration: 0.25 }
  }
};

// ============ MODAL ANIMATIONS ============
export const modalOverlay = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

export const modalContent = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      type: "spring",
      damping: 25,
      stiffness: 300
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 20,
    transition: { duration: 0.2 }
  }
};

export const modalSlideUp = {
  initial: { y: '100%' },
  animate: { 
    y: 0,
    transition: { 
      type: "spring",
      damping: 30,
      stiffness: 300
    }
  },
  exit: { 
    y: '100%',
    transition: { duration: 0.25, ease: "easeIn" }
  }
};

// ============ STAGGER ANIMATIONS ============
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

export const staggerContainerFast = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05
    }
  }
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

export const staggerItemScale = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
  }
};

// ============ CARD ANIMATIONS ============
export const cardHover = {
  rest: { scale: 1, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  hover: { 
    scale: 1.02, 
    boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
    transition: { duration: 0.3, ease: "easeOut" }
  },
  tap: { scale: 0.98 }
};

export const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2 }
  }
};

// ============ BUTTON ANIMATIONS ============
export const buttonTap = {
  tap: { scale: 0.95 },
  hover: { scale: 1.02 }
};

export const buttonPulse = {
  animate: {
    scale: [1, 1.05, 1],
    transition: { 
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// ============ NOTIFICATION ANIMATIONS ============
export const notificationBadge = {
  initial: { scale: 0 },
  animate: { 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 500,
      damping: 15
    }
  },
  exit: { scale: 0 }
};

export const dropdownVariants = {
  initial: { opacity: 0, y: -10, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 24
    }
  },
  exit: { 
    opacity: 0, 
    y: -10, 
    scale: 0.95,
    transition: { duration: 0.15 }
  }
};

// ============ TOAST ANIMATIONS ============
export const toastVariants = {
  initial: { opacity: 0, y: 50, scale: 0.9 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    y: 20, 
    scale: 0.9,
    transition: { duration: 0.2 }
  }
};

// ============ LIST ANIMATIONS ============
export const listContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const listItem = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: { duration: 0.2 }
  }
};

// ============ HEADER ANIMATIONS ============
export const headerVariants = {
  initial: { y: -100, opacity: 0 },
  animate: { 
    y: 0, 
    opacity: 1,
    transition: { 
      type: "spring",
      stiffness: 200,
      damping: 20
    }
  }
};

// ============ NAV ANIMATIONS ============
export const navItemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  hover: { y: -2 },
  tap: { scale: 0.95 }
};

// ============ FLOATING ACTION BUTTON ============
export const fabVariants = {
  initial: { scale: 0, rotate: -180 },
  animate: { 
    scale: 1, 
    rotate: 0,
    transition: { 
      type: "spring",
      stiffness: 260,
      damping: 20,
      delay: 0.3
    }
  },
  hover: { 
    scale: 1.1,
    rotate: 90,
    transition: { duration: 0.3 }
  },
  tap: { scale: 0.9 }
};

// ============ SKELETON/LOADING ANIMATIONS ============
export const shimmer = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

export const pulse = {
  animate: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// ============ CHART ANIMATIONS ============
export const barVariants = {
  initial: { scaleY: 0, originY: 1 },
  animate: (height) => ({
    scaleY: 1,
    transition: { 
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
      delay: height * 0.1
    }
  })
};

// ============ SPRING CONFIGS ============
export const springConfig = {
  gentle: { type: "spring", stiffness: 120, damping: 14 },
  wobbly: { type: "spring", stiffness: 180, damping: 12 },
  stiff: { type: "spring", stiffness: 300, damping: 20 },
  slow: { type: "spring", stiffness: 80, damping: 20 }
};

// ============ UTILITY FUNCTIONS ============
export const getStaggerDelay = (index, baseDelay = 0.1) => ({
  transition: { delay: index * baseDelay }
});
