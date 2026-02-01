import { isImageLoaded, preloadImage } from "@web/utils";
import { motion } from "motion/react";
import { memo, useEffect, useState } from "react";
import type { Game } from "../../constants";

interface GalleryCardProps {
  game: Game;
  onClick: () => void;
  index: number;
  className?: string;
  isActive?: boolean;
  onHoverChange?: (isHovered: boolean) => void;
  tabIndex?: number;
}

function GalleryCardComponent({
  game,
  onClick,
  index,
  className,
  isActive = false,
  onHoverChange,
  tabIndex = 0,
}: GalleryCardProps) {
  const [hover, setHover] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Determine if the card should show the "active/hovered" visual state
  const showActiveState = hover || isActive;

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

  const handleMouseEnter = () => {
    setHover(true);
    onHoverChange?.(true);
  };

  const handleMouseLeave = () => {
    setHover(false);
    onHoverChange?.(false);
  };

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
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`snap-start flex-shrink-0 w-[75vw] max-w-[280px] sm:w-[calc(50%-8px)] sm:max-w-none md:w-[calc(33.33%-11px)] xl:w-[calc(25%-12px)] aspect-[7/4] relative rounded-xl overflow-hidden cursor-pointer bg-app-secondary outline-none group text-left focus:ring-2 focus:ring-app-accent focus:ring-offset-4 focus:ring-offset-app-primary focus:rounded-2xl ${className}`}
      aria-label={`View ${game.name} details`}
      data-active={showActiveState}
      tabIndex={tabIndex}
    >
      <div className={`w-full h-full bg-app-primary relative`}>
        {game.image.background ? (
          <motion.img
            src={game.image.background}
            className="w-full h-full object-cover object-top"
            initial={{ opacity: 0, filter: "blur(10px)" }}
            animate={{
              opacity: imageLoaded ? (showActiveState ? 0.5 : 1) : 0,
              filter: imageLoaded ? "blur(0px)" : "blur(10px)",
              scale: showActiveState ? 1.05 : 1,
            }}
            transition={{
              opacity: { duration: 0.5 },
              filter: { duration: 0.5 },
            }}
            alt={game.name}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 font-black text-5xl">
            {game.name.substring(0, 1)}
          </div>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-app-primary from-5% to-transparent to-[100%] transition-opacity duration-300 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showActiveState ? 0.8 : 0 }}
        transition={{ duration: 0.5 }}
        className={`absolute inset-0 mix-blend-lighten bg-gradient-to-t from-app-accent from-[-20%] to-transparent to-[60%] transition-opacity duration-500 pointer-events-none`}
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showActiveState ? 0.2 : 0 }}
        transition={{ duration: 0.5 }}
        className={`absolute mix-blend-multiply inset-0 bg-app-accent duration-500 pointer-events-none`}
      />
      <motion.div
        initial={{ opacity: 0, margin: 0 }}
        animate={{
          opacity: showActiveState ? 0.8 : 0,
          margin: showActiveState ? "0.5rem" : 0,
        }}
        transition={{ duration: 0.3 }}
        className={`absolute mix-blend-overlay inset-0 rounded-xl border border-white duration-500 pointer-events-none`}
      />

      <div className="absolute bottom-0 left-0 w-full p-5 z-10 flex flex-col justify-end items-start">
        <motion.h3
          layout
          initial={{ opacity: 0, y: 1 }}
          animate={{
            opacity: showActiveState ? 1 : 0.8,
            y: showActiveState ? -5 : 1,
          }}
          transition={{ duration: 0.2 }}
          className={`text-xl font-bold leading-none transition-all duration-300 ${showActiveState ? "text-white" : "text-app-text-secondary"}`}
        >
          {game.name}
        </motion.h3>
      </div>
    </motion.button>
  );
}
export const GalleryCard = memo(GalleryCardComponent);
