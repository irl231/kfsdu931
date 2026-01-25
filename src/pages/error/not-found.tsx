import { IconAlertTriangle, IconHome } from "@tabler/icons-react";
import { motion } from "motion/react";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-app-text-primary font-sans select-none p-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center text-center max-w-md gap-8"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-zinc-900 rounded-full border border-zinc-800">
            <IconAlertTriangle
              size={32}
              className="text-app-accent"
              stroke={1.5}
            />
          </div>

          <div className="flex flex-col gap-1 text-app-text-primary">
            <h1 className="text-4xl font-bold tracking-tight">404</h1>
            <h2 className="text-lg font-medium">Page Not Found</h2>
          </div>

          <p className="text-app-text-tertiary text-sm leading-relaxed">
            The coordinates you entered seem to lead nowhere. This sector is
            currently unexplored.
          </p>
        </div>

        <a
          href="/"
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-colors"
        >
          <IconHome size={18} stroke={2} />
          <span>Return Home</span>
        </a>
      </motion.div>
    </div>
  );
};
