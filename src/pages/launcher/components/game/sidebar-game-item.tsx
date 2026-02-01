import { isImageLoaded, preloadImage } from "@web/utils";
import { motion } from "motion/react";
import { memo, useEffect, useState } from "react";
import type { Game } from "../../constants";

interface SidebarGameItemProps {
  game: Game;
  isSelected: boolean;
  onClick: () => void;
  index: number;
  elementId: string;
}

function SidebarGameItemComponent({
  game,
  isSelected,
  onClick,
  index,
  elementId,
}: SidebarGameItemProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!game.image.icon) {
      setImgLoaded(true);
      return;
    }

    // Check cache first
    if (isImageLoaded(game.image.icon)) {
      setImgLoaded(true);
      return;
    }

    // Preload image
    preloadImage(game.image.icon).then(() => {
      setImgLoaded(true);
    });
  }, [game.image.icon]);

  const baseClass = isSelected
    ? "shadow-[0_0_0_2px] shadow-app-accent opacity-100"
    : "hover:ring-white/40";

  // Determine if grayscale should be disabled
  const shouldShowColor = isSelected || isActive;

  return (
    <motion.button
      id={elementId}
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: 0.1 + index * 0.05,
        duration: 0.4,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className="snap-start flex-shrink-0 group relative flex flex-col items-center gap-1 cursor-pointer outline-none"
      aria-pressed={isSelected}
      aria-label={`${isSelected ? "Selected: " : ""}${game.name}`}
    >
      {isSelected && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute -left-[12px] top-2 w-1 h-8 rounded-r-full bg-app-accent"
        />
      )}
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden relative bg-cover bg-center bg-no-repeat ring-2 ring-transparent ${baseClass} group-focus:ring-app-accent group-focus:ring-offset-[2.5px] group-focus:ring-offset-app-primary ${!game.image.icon && "bg-app-secondary"}`}
      >
        {game.image.icon ? (
          <motion.div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${game.image.icon})` }}
            initial={{ opacity: 0, filter: "blur(5px) grayscale(100%)" }}
            animate={{
              opacity: imgLoaded ? (shouldShowColor ? 1 : 0.5) : 0,
              filter: imgLoaded
                ? `blur(0px) grayscale(${shouldShowColor ? 0 : 100}%)`
                : "blur(5px) grayscale(100%)",
            }}
            transition={{ duration: 0.4 }}
          />
        ) : (
          <span className="font-black text-sm text-app-text-primary">
            {game.name.substring(0, 1)}
          </span>
        )}
      </div>
    </motion.button>
  );
}

export const SidebarGameItem = memo(SidebarGameItemComponent);
