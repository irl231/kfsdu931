import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Game } from "../../constants";

interface SidebarGameItemProps {
  game: Game;
  isSelected: boolean;
  onClick: () => void;
  index: number;
  elementId: string;
}

export function SidebarGameItem({
  game,
  isSelected,
  onClick,
  index,
  elementId,
}: SidebarGameItemProps) {
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    if (!game.image.icon) {
      setImgLoaded(true);
      return;
    }

    const img = new Image();
    img.src = game.image.icon;
    img.onload = () => setImgLoaded(true);
    img.onerror = () => setImgLoaded(true);
  }, [game.image.icon]);

  const baseClass = isSelected
    ? "shadow-[0_0_0_2px] shadow-app-accent opacity-100"
    : "hover:ring-white/40 opacity-50 hover:opacity-100 grayscale hover:grayscale-0";

  return (
    <motion.button
      id={elementId}
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: 0.1 + index * 0.05,
        duration: 0.4,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className="snap-start flex-shrink-0 group relative flex flex-col items-center gap-1 cursor-pointer outline-none"
    >
      {isSelected && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute -left-[12px] top-2 w-1 h-8 rounded-r-full bg-app-accent"
        />
      )}
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 overflow-hidden relative bg-cover bg-center bg-no-repeat ring-1 ring-transparent ${baseClass} ${!game.image.icon && "bg-app-secondary"}`}
      >
        {game.image.icon ? (
          <motion.div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${game.image.icon})` }}
            initial={{ opacity: 0, filter: "blur(5px)" }}
            animate={{
              opacity: imgLoaded ? 1 : 0,
              filter: imgLoaded ? "blur(0px)" : "blur(5px)",
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
