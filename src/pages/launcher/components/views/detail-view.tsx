import spinnerImage from "@assets/img/spinner-dark.svg";
import {
  IconArrowBack,
  IconPlayerPlay,
  IconShare,
  IconWorld,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { memo } from "react";
import type { Game } from "../../constants";
import { ToolBtn } from "../toolbar";

interface DetailViewProps {
  game: Game;
  isLoading: boolean;
  isOpen: boolean;
  onPlay: () => void;
  onToggleSidebar: () => void;
}

function DetailViewComponent({
  game,
  isLoading,
  isOpen,
  onPlay,
  onToggleSidebar,
}: DetailViewProps) {
  const renderPlayButtonIcon = () => {
    if (isLoading) {
      return (
        <div className="w-8 h-8 pr-[2px] bg-black/10 rounded-full flex items-center justify-center">
          <motion.img
            src={spinnerImage}
            alt="loading"
            className="w-[24px] h-[24px] ml-0.5"
            animate={{ rotate: 360 }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 1.5,
              ease: "linear",
            }}
            aria-label="Loading"
          />
        </div>
      );
    }

    if (isOpen) {
      return (
        <div className="w-8 h-8 bg-black/10 rounded-full flex items-center justify-center">
          <IconArrowBack size={20} className="text-black" />
        </div>
      );
    }

    return (
      <div className="w-8 h-8 bg-black/10 rounded-full flex items-center justify-center">
        <IconPlayerPlay fill="black" size={20} className="text-black ml-0.5" />
      </div>
    );
  };

  const getButtonLabel = () => {
    if (!isLoading && isOpen) return "GO BACK";
    return "PLAY";
  };

  return (
    <motion.div
      key="detail-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex"
      role="region"
      aria-label={`${game.name} details`}
    >
      <div className="flex-1 flex flex-col justify-end p-12 pb-16 z-10">
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-2 opacity-80">
            <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 border border-white/5 uppercase tracking-widest text-app-text-primary/80">
              MMORPG
            </div>
          </div>

          <h1 className="text-7xl font-black text-white mb-4 tracking-tighter drop-shadow-2xl leading-[0.9]">
            {game.name}
          </h1>

          <p className="text-md text-app-text-primary/80 leading-relaxed max-w-md mb-10 drop-shadow-md">
            {game.desc}
          </p>

          <div className="flex items-center gap-4">
            <div
              className={
                isLoading ? "cursor-wait inline-block" : "inline-block"
              }
            >
              <button
                type="button"
                onClick={onPlay}
                aria-busy={isLoading}
                disabled={isLoading}
                className={`${isLoading ? "pointer-events-none" : "pointer-events-auto"} h-14 pl-6 pr-8 rounded-full flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl hover:brightness-110 outline-none ring-0 bg-app-accent disabled:opacity-75 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-app-accent`}
              >
                {renderPlayButtonIcon()}
                <div className="flex flex-col items-start">
                  <span className="text-black font-extrabold text-lg leading-none">
                    {getButtonLabel()}
                  </span>
                </div>
              </button>
            </div>
            <div className="flex gap-2">
              <ToolBtn
                icon={<IconWorld size={18} />}
                tooltip="Site"
                href={game.url.home}
              />
              <ToolBtn
                icon={<IconShare size={18} />}
                tooltip="Social Info"
                onClick={onToggleSidebar}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export const DetailView = memo(DetailViewComponent);
