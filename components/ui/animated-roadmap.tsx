"use client";

import * as React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

// Define the type for a single milestone
interface Milestone {
  id: number;
  name: string;
  description?: string;
  status: "complete" | "in-progress" | "pending";
  position: {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
  };
}

// Define the props for the AnimatedRoadmap component
interface AnimatedRoadmapProps extends React.HTMLAttributes<HTMLDivElement> {
  milestones: Milestone[];
}

// Sub-component for a single milestone marker
const MilestoneMarker = ({ milestone }: { milestone: Milestone }) => {
  const statusClasses = {
    complete: "bg-emerald-500 border-emerald-400",
    "in-progress": "bg-accent border-accent animate-pulse",
    pending: "bg-zinc-600 border-zinc-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: milestone.id * 0.15, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.8 }}
      className="absolute flex items-center gap-3"
      style={milestone.position}
    >
      <div className="relative flex h-10 w-10 items-center justify-center">
        <div
          className={cn(
            "absolute h-4 w-4 rounded-full border-2 z-10",
            statusClasses[milestone.status]
          )}
        />
        <div className="absolute h-full w-full rounded-full bg-accent/10 animate-ping" style={{ animationDuration: "3s" }} />
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm px-4 py-2 shadow-lg">
        <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{milestone.name}</div>
        {milestone.description && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{milestone.description}</div>
        )}
      </div>
    </motion.div>
  );
};

// Main AnimatedRoadmap component
const AnimatedRoadmap = React.forwardRef<HTMLDivElement, AnimatedRoadmapProps>(
  ({ className, milestones, ...props }, ref) => {
    const targetRef = React.useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
      target: targetRef,
      offset: ["start end", "end start"],
    });

    // Animate the path drawing based on scroll progress
    const pathLength = useTransform(scrollYProgress, [0.1, 0.6], [0, 1]);

    return (
      <div
        ref={targetRef}
        className={cn("relative w-full max-w-5xl mx-auto", className)}
        {...props}
      >
        {/* SVG path for animation */}
        <div className="relative h-[500px]">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 800 500"
            preserveAspectRatio="xMidYMid meet"
            className="absolute top-0 left-0"
          >
            {/* Background path (gray) */}
            <path
              d="M 50 400 Q 150 100 300 250 T 500 150 T 750 50"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="3"
              strokeDasharray="10 5"
              strokeLinecap="round"
            />
            {/* Animated path */}
            <motion.path
              d="M 50 400 Q 150 100 300 250 T 500 150 T 750 50"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="3"
              strokeDasharray="10 5"
              strokeLinecap="round"
              style={{ pathLength }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(59, 130, 246)" />
                <stop offset="50%" stopColor="rgb(139, 92, 246)" />
                <stop offset="100%" stopColor="rgb(236, 72, 153)" />
              </linearGradient>
            </defs>
          </svg>

          {/* Render each milestone */}
          {milestones.map((milestone) => (
            <MilestoneMarker key={milestone.id} milestone={milestone} />
          ))}
        </div>
      </div>
    );
  }
);

AnimatedRoadmap.displayName = "AnimatedRoadmap";

export { AnimatedRoadmap };
