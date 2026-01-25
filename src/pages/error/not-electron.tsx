import { motion } from "motion/react";

export const NotElectronPage: React.FC = () => {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-app-text-primary font-sans select-none p-8 text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md flex flex-col items-center gap-8"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Launcher Required
          </h1>
          <p className="text-app-text-tertiary text-sm leading-relaxed">
            This application is designed to run exclusively within the desktop
            launcher environment. Please open the official launcher to access
            this content.
          </p>
        </div>

        <a
          href="https://github.com/aqwps/launcher"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-app-text-tertiary hover:bg-zinc-800 hover:text-app-text-primary transition-colors"
        >
          Download Launcher
        </a>
      </motion.div>
    </div>
  );
};
