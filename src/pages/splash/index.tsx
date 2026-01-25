import splashSpinner from "@assets/img/spinner-light.svg";
import splashImage from "@assets/img/splash.png";

import { BackgroundImage } from "@web/components/overlay/bg-image";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

export const SplashPage: React.FC = () => {
  const [state, setState] = useState({
    statusText: "Initializing environment",
    isLoading: true,
    progress: 0,
  });

  useEffect(() => {
    const unlistenSplashMessage = window.electron.onSplashState(
      (message, isLoading = true, progress = 0) => {
        setState({
          statusText: message,
          isLoading,
          progress,
        });
      },
    );
    window.electron.splashReady();

    return () => {
      unlistenSplashMessage();
    };
  }, []);

  return (
    <div
      className="flex h-screen w-screen select-none items-center justify-center bg-app-primary font-sans text-app-text-primary overflow-hidden relative"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="bg-app-primary absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          {splashImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <BackgroundImage src={splashImage} />
              <div className="absolute inset-0 bg-linear-to-r from-app-primary via-app-primary/60 to-transparent" />
              <div className="absolute inset-0 bg-linear-to-t from-app-primary via-app-primary/20 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-20 flex h-full w-full flex-col justify-between px-8 py-4">
        <div />
        <div className="flex flex-col items-start gap-6 max-w-xl w-full">
          <div className="w-full flex flex-col gap-4 h-20 align-bottom">
            <div className="flex items-center gap-3 mt-4">
              {state.isLoading && (
                <motion.img
                  src={splashSpinner}
                  alt="loading"
                  className="w-5 h-5 opacity-90 brightness-200 dark:hidden block"
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear",
                  }}
                />
              )}

              <AnimatePresence mode="wait">
                <motion.p
                  key={state.statusText}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-sm font-medium text-app-text-primary tracking-wide"
                >
                  {state.statusText}
                </motion.p>
              </AnimatePresence>
            </div>

            {state.progress > 0 && (
              <div className="w-full relative group">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 backdrop-blur-sm border border-white/5">
                  <motion.div
                    className="relative h-full bg-app-accent shadow-[0_0_10px_rgba(255,225,76,0.8)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${state.progress}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 20 }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 bg-white blur-sm rounded-full opacity-60" />
                  </motion.div>
                </div>

                <motion.div
                  className="absolute right-0 -top-6 text-xs font-bold text-app-accent opacity-80 font-mono"
                  animate={{ opacity: state.progress > 0 ? 0.8 : 0 }}
                >
                  {Math.round(state.progress)}%
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
