import coverImage from "@assets/img/cover.png";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GAMES } from "../../constants";
import { GalleryCard } from "../game";

interface GalleryViewProps {
  appName: string;
  onSelectGame: (gameId: string) => void;
}

export function GalleryView({ appName, onSelectGame }: GalleryViewProps) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  // Memoize scroll handler - follows `rerender-defer-reads` pattern
  const checkGalleryScroll = useCallback(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    const { scrollLeft, scrollWidth, clientWidth } = gallery;
    setShowLeftFade(scrollLeft > 20);
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 20);
  }, []);

  // Use passive event listener for scroll performance (WCAG 2.2)
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;

    gallery.scrollTo({ left: 0, behavior: "instant" });

    const timeoutId = setTimeout(checkGalleryScroll, 100);

    // Add passive scroll listener for better performance
    gallery.addEventListener("scroll", checkGalleryScroll, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      gallery.removeEventListener("scroll", checkGalleryScroll);
    };
  }, [checkGalleryScroll]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex"
      aria-label="Game gallery"
    >
      <div className="flex-1 relative flex flex-col">
        <div className="flex-1 relative overflow-hidden w-full group">
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              backgroundPosition: "-1px -1px",
            }}
          />
          <div
            className="absolute inset-0 bg-cover bg-[center_-2rem] opacity-80 transition-transform duration-[15s] group-hover:scale-105"
            style={{ backgroundImage: `url(${coverImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-app-primary via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 p-10 max-w-4xl z-10">
            <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg tracking-tight transition-colors duration-300">
              {appName}
            </h1>
            <p className="text-app-text-primary/80 group-hover:text-app-text-primary text-md max-w-xl transition-colors duration-300">
              One launcher for all adventures.
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 w-full bg-app-primary pt-8 border-t border-white/5 z-20 relative">
          <AnimatePresence>
            {showLeftFade && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-app-primary to-transparent z-30 pointer-events-none"
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showRightFade && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-app-primary to-transparent z-30 pointer-events-none"
              />
            )}
          </AnimatePresence>

          <div className="px-10 flex items-center gap-3 mb-4 relative z-40">
            <h2 className="text-xl font-bold text-white">All Games</h2>
          </div>

          <div
            ref={galleryRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-10 no-scrollbar scroll-pl-10 w-full pb-10"
            role="list"
            aria-label="Available games"
          >
            {GAMES.map((game, index) => (
              <GalleryCard
                key={game.id}
                game={game}
                index={index}
                onClick={() => onSelectGame(game.id)}
              />
            ))}
            <div className="flex-shrink-0 w-6" />
          </div>
        </div>
      </div>
    </motion.section>
  );
}
