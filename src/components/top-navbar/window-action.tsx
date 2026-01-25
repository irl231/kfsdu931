import { IconMinus, IconSquare, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";

export const WindowAction = () => {
  const [_isMaximized, setIsMaximized] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    window.electron.isMaximized().then(setIsMaximized);
    window.electron.isFullScreen().then(setIsFullScreen);
    const unlistenMaximize =
      window.electron.onWindowMaximizeChange(setIsMaximized);
    const unlistenFullScreen =
      window.electron.onWindowFullScreenChange(setIsFullScreen);

    return () => {
      unlistenMaximize();
      unlistenFullScreen();
    };
  }, []);

  const handleMinimize = () => {
    window.electron.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electron.toggleMaximizeWindow();
  };

  const handleClose = () => {
    window.electron.closeWindow();
  };

  const platform = window.electron.getPlatform();
  if (platform && !["linux", "windows"].includes(platform)) return null;

  return (
    <>
      {!isFullScreen && (
        <>
          <div className="h-full flex-1 -ml-2 flex items-end relative max-w-fit">
            <div
              className={`w-[1px] h-4 mb-2 bg-white/10 mr-2 flex-shrink-0`}
            />
          </div>
          <div
            className="flex items-stretch h-full flex-shrink-0"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
          >
            <button
              type="button"
              className="h-full w-10 aspect-square flex items-center justify-center hover:bg-white/10 text-app-text-primary/50 hover:text-app-text-primary transition-colors outline-none"
              onClick={handleMinimize}
            >
              <IconMinus size={16} />
            </button>
            <button
              type="button"
              className="h-full w-10 aspect-square flex items-center justify-center hover:bg-white/10 text-app-text-primary/50 hover:text-app-text-primary transition-colors outline-none"
              onClick={handleMaximize}
            >
              <IconSquare size={12} />
            </button>
            <button
              type="button"
              className="h-full w-10 aspect-square flex items-center justify-center hover:bg-red-500 hover:text-app-text-primary text-app-text-primary/50 transition-colors outline-none"
              onClick={handleClose}
            >
              <IconX size={16} />
            </button>
          </div>
        </>
      )}
    </>
  );
};
