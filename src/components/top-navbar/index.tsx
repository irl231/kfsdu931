import { IconSettings } from "@tabler/icons-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserTabsList } from "../browser-tabs";
import { TabPanel } from "../browser-tabs/tab-panel";
import type { BrowserTab } from "../webview";
import { WindowAction } from "./window-action";

interface TopNavbarProps {
  activeTopTab: string;
  setActiveTopTab: (id: string) => void;
  visibleTabs: BrowserTab[];
  handleReorder: (tabs: BrowserTab[]) => void;
  closeTab: (e: React.MouseEvent | null, id: string) => void;
  toggleMute: (e: React.MouseEvent, id: string) => void;
  setIsTabDragging: (isDragging: boolean) => void;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  isSettingsOpen: boolean;
}

export const TopNavbar = ({
  activeTopTab,
  setActiveTopTab,
  visibleTabs,
  handleReorder,
  closeTab,
  toggleMute,
  setIsTabDragging,
  onOpenSettings,
  onCloseSettings,
  isSettingsOpen,
}: TopNavbarProps) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  // Memoize platform check - only compute once
  const platform = useMemo(() => window.electron.getPlatform(), []);
  const isMac = useMemo(
    () => !["linux", "windows"].includes(platform),
    [platform],
  );

  useEffect(() => {
    window.electron.isFullScreen().then(setIsFullScreen);
    const unlistenFullScreen =
      window.electron.onWindowFullScreenChange(setIsFullScreen);

    return () => {
      unlistenFullScreen();
    };
  }, []);

  const handleSettings = useCallback(() => {
    if (isSettingsOpen) onCloseSettings();
    else onOpenSettings();
  }, [isSettingsOpen, onOpenSettings, onCloseSettings]);

  return (
    <nav className="relative flex flex-col z-30" aria-label="Main navigation">
      <div
        className={`${isMac ? "h-[40px]" : "h-[33px]"} relative flex items-center pl-2 bg-app-primary`}
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <motion.div
          initial={false}
          animate={{ width: isFullScreen || !isMac ? 64 : 64 }}
          className="h-full"
          transition={{ duration: 0.2, ease: "easeInOut" }}
        />

        <div className="h-full ml-[32px] flex-1 flex items-end relative max-w-fit">
          <button
            type="button"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            onClick={() => {
              setActiveTopTab("launcher");
            }}
            aria-label="Go to launcher home"
            aria-pressed={activeTopTab === "launcher"}
            className={`${isMac ? "h-[32px]" : "h-[26px]"} group relative flex-shrink-0 focus-visible:outline-2 focus-visible:outline-app-accent focus-visible:outline-offset-2 focus-visible:rounded transition-colors ${activeTopTab === "launcher" ? "text-app-text-primary" : "text-app-text-primary/40 hover:text-app-accent"}`}
          >
            <TabPanel isActive={activeTopTab === "launcher"} />
            <div
              className={`relative z-30 flex items-center justify-center px-4 py-1.5 cursor-pointer transition-colors`}
            >
              <span className="text-xs truncate">Launcher</span>
            </div>
          </button>
          <div
            className={`w-[1px] h-4 mb-2 bg-white/10 ml-3 mr-1 flex-shrink-0`}
          />
        </div>

        <div className="flex-1 h-full relative min-w-0">
          <div className="absolute inset-0 overflow-visible">
            <BrowserTabsList
              tabs={visibleTabs}
              activeTabId={activeTopTab}
              onReorder={handleReorder}
              onTabClick={setActiveTopTab}
              onTabClose={closeTab}
              onToggleMute={toggleMute}
              setIsTabDragging={setIsTabDragging}
            />
          </div>
        </div>

        <div className="h-full mr-4 flex-1 flex items-end relative max-w-fit">
          <div
            className={`w-[1px] h-4 mb-2 bg-white/10 mr-2 ml-1 flex-shrink-0`}
          />
          <button
            type="button"
            onClick={handleSettings}
            className="flex-shrink-0 flex items-center justify-center mb-2 mr-2"
            style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
            aria-label="Open settings"
          >
            <IconSettings
              size={18}
              className="text-app-text-primary/30 hover:text-app-accent transition-transform duration-500 ease-in-out hover:rotate-180 cursor-pointer outline-none"
            />
          </button>
        </div>

        <WindowAction />
      </div>
      <div className="h-[15px] w-full rounded-t-full flex-grow bg-[#202224]"></div>
    </nav>
  );
};
