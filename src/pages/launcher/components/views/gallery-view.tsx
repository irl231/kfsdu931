import coverImage from "@assets/img/cover.png";
import { motion } from "motion/react";
import { GamesSwiper } from "./games-swiper";

interface GalleryViewProps {
  appName: string;
  onSelectGame: (gameId: string) => void;
}

export function GalleryView({ appName, onSelectGame }: GalleryViewProps) {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 flex"
      aria-label="Game gallery"
    >
      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden">
        <div className="flex-1 relative overflow-visible w-full group">
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              backgroundPosition: "-1px -1px",
            }}
          />
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 md:left-auto md:right-0 md:w-[70%] h-full overflow-visible"
          >
            <motion.div
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.8 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
              className="absolute inset-0 md:w-[125%] xl:w-[135%] bg-cover bg-center md:bg-[-3.5rem_-2rem] xl:bg-[-10rem_-2rem] bg-no-repeat overflow-visible"
              style={{ backgroundImage: `url(${coverImage})` }}
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-app-primary via-transparent to-transparent" />
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute bottom-0 left-0 p-4 sm:p-6 md:p-10 max-w-4xl z-10"
          >
            <h1 className="text-6xl md:text-8xl xl:text-9xl font-title font-bold text-white mb-2 md:mb-3 drop-shadow-lg tracking-tight transition-colors duration-300">
              <span>{appName.slice(0, 2).toUpperCase()}</span>
              <span className="text-app-accent">
                {appName.slice(2).toLowerCase()}
              </span>
            </h1>
            <p className="text-app-text-primary/80 group-hover:text-app-text-primary text-base md:text-md max-w-xl transition-colors duration-300">
              One launcher for all adventures.
            </p>
          </motion.div>
        </div>

        <GamesSwiper onSelectGame={onSelectGame} />
      </div>
    </motion.section>
  );
}
