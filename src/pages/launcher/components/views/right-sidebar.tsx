import { IconDeviceGamepad2, IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import type { Game } from "../../constants";

interface RightSidebarProps {
  isOpen: boolean;
  game: Game;
  onClose: () => void;
}

export function RightSidebar({ isOpen, game, onClose }: RightSidebarProps) {
  const rightSidebarRef = useRef<HTMLDivElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);

  const checkScroll = useCallback(() => {
    const sidebar = rightSidebarRef.current;
    if (!sidebar) return;
    setShowTopFade(sidebar.scrollTop > 8);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-[380px] h-full bg-app-secondary border-l border-white/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute right-0 top-0 bg-transparent p-6 pb-4 flex items-center justify-between flex-shrink-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="outline-none ring-0 bg-transparent text-app-text-primary/40 hover:text-app-text-primary transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 relative min-h-0">
          <AnimatePresence>
            {showTopFade && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-app-secondary to-transparent z-10 pointer-events-none"
              />
            )}
          </AnimatePresence>

          <div
            ref={rightSidebarRef}
            onScroll={checkScroll}
            className="h-full overflow-y-auto p-6 space-y-6 no-scrollbar"
          >
            <div>
              <h3 className="text-sm font-bold text-app-text-secondary mb-2">
                About
              </h3>
              <p className="text-sm text-app-text-primary/60 leading-relaxed">
                {game.desc}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold text-app-text-primary mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5865F2]" />
                Official Discord
              </h3>
              <div className="w-full h-[300px] rounded-xl overflow-hidden bg-[#2f3136] border border-white/5 relative">
                {game.discordId ? (
                  <iframe
                    src={`https://discord.com/widget?id=${game.discordId}&theme=dark`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                    title="Discord Widget"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-app-text-primary/30 gap-2 p-6 text-center">
                    <IconDeviceGamepad2 size={32} />
                    <span className="text-xs">
                      Discord widget not configured for this game.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
