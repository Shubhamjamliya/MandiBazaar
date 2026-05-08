import { ReactNode } from 'react';
import { motion } from 'framer-motion';

/**
 * Premium loading state with an animated basket
 * Features opening/closing lid and popping items for a delightful experience
 */
export default function PageLoader({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {children || (
        <div className="flex flex-col items-center gap-10">
          <div className="relative w-36 h-36">
            {/* Floating Basket Container */}
            <motion.div
              animate={{
                y: [0, -12, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-full h-full"
            >
              <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                {/* Items that pop out when lids open */}
                <motion.g
                  animate={{
                    y: [15, -25, 15],
                    scale: [0.5, 1.2, 0.5],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    times: [0, 0.4, 0.8],
                    ease: "anticipate"
                  }}
                >
                  {/* Tomato */}
                  <circle cx="35" cy="45" r="6" fill="#ef4444" />
                  {/* Leafy Green */}
                  <path d="M55 35 Q60 25 70 45 Q60 55 55 45 Z" fill="#22c55e" />
                  {/* Carrot */}
                  <rect x="48" y="38" width="6" height="15" rx="1.5" fill="#fb923c" transform="rotate(-15, 51, 45)" />
                </motion.g>

                {/* Basket Base */}
                <path
                  d="M25 50 L75 50 L70 85 L30 85 Z"
                  fill="#fbbf24"
                  stroke="#d97706"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

                {/* Basket Texture/Grid */}
                <path d="M35 50 L38 85 M45 50 L45 85 M55 50 L55 85 M65 50 L62 85" stroke="#d97706" strokeWidth="1" opacity="0.4" />
                <path d="M28 62 L72 62 M30 74 L70 74" stroke="#d97706" strokeWidth="1" opacity="0.4" />

                {/* Left Lid - Animated Open/Close */}
                <motion.path
                  d="M25 50 L50 50"
                  stroke="#d97706"
                  strokeWidth="3.5"
                  fill="#fbbf24"
                  style={{ originX: "25px", originY: "50px" }}
                  animate={{
                    rotateZ: [0, -115, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />

                {/* Right Lid - Animated Open/Close */}
                <motion.path
                  d="M75 50 L50 50"
                  stroke="#d97706"
                  strokeWidth="3.5"
                  fill="#fbbf24"
                  style={{ originX: "75px", originY: "50px" }}
                  animate={{
                    rotateZ: [0, 115, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />

                {/* Handle */}
                <path
                  d="M32 50 Q50 15 68 50"
                  stroke="#92400e"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              </svg>
            </motion.div>

            {/* Perspective Shadow */}
            <motion.div
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-24 h-3 bg-black/5 rounded-full blur-md"
              animate={{
                scaleX: [0.7, 1.3, 0.7],
                opacity: [0.05, 0.2, 0.05]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>

          {/* Branding & Status */}
          <div className="flex flex-col items-center">
            <motion.div
              className="relative overflow-hidden group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-3xl font-black text-emerald-600 tracking-tighter italic">
                Mandi Bazaar
              </h2>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent w-full skew-x-12"
                animate={{
                  x: ['-150%', '150%']
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  repeatDelay: 1
                }}
              />
            </motion.div>

            <div className="flex items-center gap-3 mt-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      delay: i * 0.2
                    }}
                    className="w-2 h-2 bg-yellow-400 rounded-full shadow-sm"
                  />
                ))}
              </div>
              <p className="text-[10px] text-neutral-400 font-black uppercase tracking-[0.25em]">
                Gathering Freshness
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

