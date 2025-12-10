'use client';

import { Sun, Moon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

interface Particle {
  id: number;
  delay: number;
  duration: number;
}

export default function CinematicThemeSwitcherMini() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleRef = useRef<HTMLButtonElement>(null);
  const isDark = mounted && (theme === 'dark' || resolvedTheme === 'dark');

  useEffect(() => {
    setMounted(true);
  }, []);

  const generateParticles = () => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 3; i++) {
      newParticles.push({
        id: i,
        delay: i * 0.08,
        duration: 0.5 + i * 0.1,
      });
    }
    setParticles(newParticles);
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
      setParticles([]);
    }, 800);
  };

  const handleToggle = () => {
    generateParticles();
    setTheme(isDark ? 'light' : 'dark');
  };

  if (!mounted) {
    return (
      <div className="relative inline-block">
        <div className="relative flex h-8 w-14 items-center rounded-full bg-gray-200 dark:bg-zinc-700 p-0.5" />
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <motion.button
        ref={toggleRef}
        onClick={handleToggle}
        className="relative flex h-8 w-14 items-center rounded-full p-[3px] transition-all duration-300 focus:outline-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at top left, #1e293b 0%, #0f172a 40%, #020617 100%)'
            : 'radial-gradient(ellipse at top left, #ffffff 0%, #f1f5f9 40%, #cbd5e1 100%)',
          boxShadow: isDark
            ? `
              inset 2px 2px 6px rgba(0, 0, 0, 0.8),
              inset -2px -2px 6px rgba(71, 85, 105, 0.3),
              0 2px 8px rgba(0, 0, 0, 0.3)
            `
            : `
              inset 2px 2px 6px rgba(148, 163, 184, 0.4),
              inset -2px -2px 6px rgba(255, 255, 255, 0.9),
              0 2px 8px rgba(0, 0, 0, 0.08)
            `,
          border: isDark
            ? '1px solid rgba(51, 65, 85, 0.5)'
            : '1px solid rgba(203, 213, 225, 0.5)',
        }}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        role="switch"
        aria-checked={isDark}
        whileTap={{ scale: 0.95 }}
      >
        {/* Background Icons */}
        <div className="absolute inset-0 flex items-center justify-between px-2">
          <Sun size={12} className={isDark ? 'text-yellow-100/50' : 'text-amber-500'} />
          <Moon size={12} className={isDark ? 'text-yellow-100' : 'text-slate-400'} />
        </div>

        {/* Thumb */}
        <motion.div
          className="relative z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full overflow-hidden"
          style={{
            background: isDark
              ? 'linear-gradient(145deg, #64748b 0%, #475569 50%, #334155 100%)'
              : 'linear-gradient(145deg, #ffffff 0%, #fefefe 50%, #f8fafc 100%)',
            boxShadow: isDark
              ? `
                inset 1px 1px 2px rgba(100, 116, 139, 0.4),
                inset -1px -1px 2px rgba(0, 0, 0, 0.6),
                0 4px 12px rgba(0, 0, 0, 0.4)
              `
              : `
                inset 1px 1px 2px rgba(255, 255, 255, 1),
                inset -1px -1px 2px rgba(203, 213, 225, 0.3),
                0 4px 12px rgba(0, 0, 0, 0.12)
              `,
            border: isDark
              ? '1px solid rgba(148, 163, 184, 0.2)'
              : '1px solid rgba(255, 255, 255, 0.8)',
          }}
          animate={{
            x: isDark ? 24 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 25,
          }}
        >
          {/* Particles */}
          {isAnimating && particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: '6px',
                  height: '6px',
                  background: isDark
                    ? 'radial-gradient(circle, rgba(147, 197, 253, 0.6) 0%, rgba(147, 197, 253, 0) 70%)'
                    : 'radial-gradient(circle, rgba(251, 191, 36, 0.8) 0%, rgba(251, 191, 36, 0) 70%)',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 5, opacity: [0, 1, 0] }}
                transition={{
                  duration: particle.duration,
                  delay: particle.delay,
                  ease: 'easeOut',
                }}
              />
            </motion.div>
          ))}

          {/* Icon */}
          <div className="relative z-10">
            {isDark ? (
              <Moon size={12} className="text-yellow-200" />
            ) : (
              <Sun size={12} className="text-amber-500" />
            )}
          </div>
        </motion.div>
      </motion.button>
    </div>
  );
}
