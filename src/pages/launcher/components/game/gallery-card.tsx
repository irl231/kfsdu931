import { isImageLoaded, preloadImage } from "@web/utils";
import { motion } from "motion/react";
import { memo, useEffect, useMemo, useState } from "react";
import type { Game } from "../../constants";

interface GalleryCardProps {
  game: Game;
  onClick: () => void;
  index: number;
}

function GalleryCardComponent({ game, onClick, index }: GalleryCardProps) {
  const [hover, setHover] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Check if image is already loaded on mount
  useEffect(() => {
    if (!game.image.background) {
      setImageLoaded(true);
      return;
    }

    // Check cache first
    if (isImageLoaded(game.image.background)) {
      setImageLoaded(true);
      return;
    }

    // Preload and subscribe to completion
    preloadImage(game.image.background).then(() => {
      setImageLoaded(true);
    });
  }, [game.image.background]);

  const handleClick = useMemo(() => onClick, [onClick]);

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="snap-start flex-shrink-0 md:w-[calc(33.33%-11px)] xl:w-[calc(25%-12px)] aspect-[7/4] relative rounded-xl overflow-hidden cursor-pointer shadow-lg bg-app-secondary outline-none group transition-colors text-left"
      aria-label={`View ${game.name} details`}
    >
      <div className="w-full h-full overflow-hidden bg-app-primary relative">
        {game.image.background ? (
          <motion.img
            src={game.image.background}
            className="w-full h-full object-cover object-top"
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{
              opacity: imageLoaded ? (hover ? 0.5 : 1) : 0,
              filter: imageLoaded ? "blur(0px)" : "blur(10px)",
              scale: hover ? 1.05 : 1,
            }}
            transition={{
              opacity: { duration: 0.5 },
              filter: { duration: 0.5 },
              scale: { duration: 0.7, ease: [0.25, 0.4, 0.25, 1] },
            }}
            alt={game.name}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 font-black text-5xl">
            {game.name.substring(0, 1)}
          </div>
        )}
      </div>

      <div className="absolute inset-0 opacity-90 bg-gradient-to-t from-app-primary from-0% to-transparent to-[80%] transition-opacity duration-300 pointer-events-none" />
      <div className="absolute inset-0 mix-blend-lighten bg-gradient-to-t from-app-accent from-[-20%] to-transparent to-[60%] transition-opacity duration-500 opacity-0 group-hover:opacity-100 pointer-events-none" />

      <div className="absolute bottom-0 left-0 w-full p-5 z-10 flex flex-col justify-end items-start">
        <h3 className="text-xl text-app-text-secondary group-hover:text-white font-bold leading-none drop-shadow-md transition-transform duration-300 group-hover:-translate-y-1">
          {game.name}
        </h3>
      </div>
    </motion.button>
  );
}
export const GalleryCard = memo(GalleryCardComponent);
