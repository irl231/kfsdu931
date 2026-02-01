import { IconLayoutGrid } from "@tabler/icons-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { GAMES } from "../../constants";
import { useScrollFade } from "../../hooks";
import { SidebarGameItem } from "../game";

interface LeftSidebarProps {
  isVisible: boolean;
  viewMode: "gallery" | "detail";
  selectedGameId: string | null;
  onShowGallery: () => void;
  onSelectGame: (gameId: string) => void;
}

export function LeftSidebar({
  isVisible,
  viewMode,
  selectedGameId,
  onShowGallery,
  onSelectGame,
}: LeftSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { showTopFade, showBottomFade, checkScroll } =
    useScrollFade(sidebarRef);

  useEffect(() => {
    if (!selectedGameId || viewMode !== "detail" || !sidebarRef.current) return;

    const element = document.getElementById(`sidebar-item-${selectedGameId}`);
    if (!element) return;

    const container = sidebarRef.current;
    const top =
      element.offsetTop - container.clientHeight / 2 + element.offsetHeight / 2;
    container.scrollTo({ top, behavior: "smooth" });
  }, [selectedGameId, viewMode]);

  useEffect(() => {
    setTimeout(checkScroll, 100);
  }, [checkScroll]);

  return (
    <motion.div
      initial={{ x: -72 }}
      animate={{ x: isVisible ? 0 : -72 }}
      exit={{ x: -80 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="absolute flex z-10 w-[72px] h-full"
    >
      <div className="absolute h-full w-48 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-app-primary from-0% via-app-primary/80 via-80% to-transparent to-100%" />
      </div>
      <div className="relative flex flex-col w-full items-center pt-3 pb-6 bg-app-primary z-10">
        <button
          type="button"
          className="mb-3 flex-shrink-0 flex flex-col items-center gap-1 group cursor-pointer outline-none"
          onClick={onShowGallery}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 border-2 border-white/5
              group-focus:ring-2 group-focus:ring-zinc-700 group-focus:ring-offset-2 group-focus:ring-offset-app-primary
              ${
                viewMode === "gallery"
                  ? "bg-app-accent text-black group-focus:ring-offset-app-primary group-focus:ring-offset-2 group-focus:ring-emerald-400"
                  : "bg-white/5 text-app-text-primary/50 hover:bg-white/10 hover:text-app-text-primary"
              }`}
          >
            <IconLayoutGrid size={20} />
          </div>
        </button>
        <div className="flex-1 w-full relative overflow-hidden flex flex-col min-h-0">
          <div
            ref={sidebarRef}
            onScroll={checkScroll}
            className="w-full h-full overflow-y-auto flex flex-col items-center gap-4 pt-1 snap-y snap-mandatory scroll-pt-3 scroll-pb-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-all duration-300"
            style={{
              maskImage: `linear-gradient(to bottom, ${showTopFade ? "transparent" : "black"} 0%, black 32px, black calc(100% - 32px), ${showBottomFade ? "transparent" : "black"} 100%)`,
              WebkitMaskImage: `linear-gradient(to bottom, ${showTopFade ? "transparent" : "black"} 0%, black 32px, black calc(100% - 32px), ${showBottomFade ? "transparent" : "black"} 100%)`,
            }}
          >
            <div className="snap-start flex-shrink-0 h-3 w-full" />
            {GAMES.map((game, index) => {
              const isSelected =
                selectedGameId === game.id && viewMode === "detail";
              return (
                <SidebarGameItem
                  key={game.id}
                  elementId={`sidebar-item-${game.id}`}
                  game={game}
                  index={index}
                  isSelected={isSelected}
                  onClick={() => onSelectGame(game.id)}
                />
              );
            })}
            <div className="snap-start flex-shrink-0 h-12 w-full" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
