import { BackgroundImage } from "@web/components/overlay/bg-image";
import { TopNavbar } from "@web/components/top-navbar";
import { Webview } from "@web/components/webview";
import { AnimatePresence, motion } from "motion/react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DetailView,
  GalleryView,
  LeftSidebar,
  RightSidebar,
} from "./components";
import { GAMES } from "./constants";
import { useBrowserTabs } from "./hooks";

// Lazy load SettingsModal to reduce initial bundle
const SettingsModal = lazy(() =>
  import("./components/settings/settings-modal").then((mod) => ({
    default: mod.SettingsModal,
  })),
);

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

export function LauncherPage() {
  const [appName, setAppName] = useState("");
  const [viewMode, setViewMode] = useState<"gallery" | "detail">("gallery");
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isTabDragging, setIsTabDragging] = useState(false);

  const {
    stableTabs,
    visibleTabs,
    activeTopTab,
    setActiveTopTab,
    closeTab,
    handleReorder,
    playGame,
    updateTabTitle,
    updateTabUrl,
    isGameLoading,
    isGameOpen,
    toggleMute,
  } = useBrowserTabs();

  // Memoize computed value to avoid recalculation
  const activeGame = useMemo(
    () => GAMES.find((g) => g.id === selectedGameId) ?? GAMES[0],
    [selectedGameId],
  );

  useEffect(() => {
    // Fetch app name once and prevent state updates after unmount
    let mounted = true;
    window.electron.getAppName().then((name) => {
      if (mounted) setAppName(name);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Stable callbacks for state updates
  const handleSelectGame = useCallback((gameId: string) => {
    setShowSettings(false);
    setSelectedGameId(gameId);
    setViewMode("detail");
    setShowRightSidebar(false);
  }, []);

  const handleShowGallery = useCallback(() => {
    setShowSettings(false);
    setSelectedGameId(null);
    setViewMode("gallery");
    setShowRightSidebar(false);
  }, []);

  // Stable callback - activeGame from useMemo
  const handlePlay = useCallback(() => {
    playGame(activeGame);
  }, [playGame, activeGame]);

  const handleToggleSidebar = useCallback(() => {
    setShowRightSidebar((prev) => !prev);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const isLauncherActive = activeTopTab === "launcher";

  return (
    <main
      className="flex flex-col w-full h-screen font-sans text-app-text-primary select-none overflow-hidden relative bg-app-primary"
      role="application"
      aria-label="Game Launcher"
    >
      {isTabDragging && (
        <div
          className="fixed inset-0 z-[99999]"
          style={{ cursor: "grabbing" }}
          aria-hidden="true"
        />
      )}

      <TopNavbar
        activeTopTab={activeTopTab}
        setActiveTopTab={setActiveTopTab}
        visibleTabs={visibleTabs}
        handleReorder={handleReorder}
        closeTab={closeTab}
        toggleMute={toggleMute}
        setIsTabDragging={setIsTabDragging}
        onOpenSettings={handleOpenSettings}
        onCloseSettings={handleCloseSettings}
        isSettingsOpen={showSettings}
      />

      <div className="flex-1 relative flex overflow-hidden">
        <div
          className={`absolute inset-0 flex flex-row transition-opacity duration-300`}
        >
          <div className="flex-1 relative h-full p-2 pt-0 bg-[#202224]">
            <div className="relative h-full w-full border border-white/5 overflow-hidden rounded-2xl">
              <AnimatePresence>
                {showSettings && (
                  <Suspense fallback={null}>
                    <SettingsModal
                      isOpen={showSettings}
                      onClose={handleCloseSettings}
                    />
                  </Suspense>
                )}
              </AnimatePresence>

              <LeftSidebar
                isVisible={isLauncherActive}
                viewMode={viewMode}
                selectedGameId={selectedGameId}
                onShowGallery={handleShowGallery}
                onSelectGame={handleSelectGame}
              />

              <AnimatePresence>
                {showRightSidebar && selectedGameId && (
                  <RightSidebar
                    isOpen={showRightSidebar}
                    game={activeGame}
                    onClose={() => setShowRightSidebar(false)}
                  />
                )}
              </AnimatePresence>

              <div className="bg-app-primary absolute inset-0 z-0">
                <AnimatePresence mode="wait">
                  {viewMode === "detail" && selectedGameId && (
                    <motion.div
                      key={selectedGameId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0"
                    >
                      <BackgroundImage src={activeGame.image.background} />
                      <div className="absolute inset-0 bg-gradient-to-r from-app-primary via-app-primary/80 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-t from-app-primary via-app-primary/40 to-transparent" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative h-full w-full flex flex-row">
                <motion.div
                  initial={false}
                  animate={{ width: isLauncherActive ? 80 : 0 }}
                  className="h-full relative flex-shrink-0"
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                />
                <div
                  className={`relative flex-grow transition-opacity duration-200 ${
                    isLauncherActive
                      ? "opacity-100 z-10"
                      : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {viewMode === "gallery" && (
                      <div className="relative w-full h-full">
                        <GalleryView
                          appName={appName}
                          onSelectGame={handleSelectGame}
                        />
                      </div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {viewMode === "detail" && selectedGameId && (
                      <DetailView
                        game={activeGame}
                        isLoading={isGameLoading(activeGame.url.game)}
                        isOpen={isGameOpen(activeGame.url.game)}
                        onPlay={handlePlay}
                        onToggleSidebar={handleToggleSidebar}
                      />
                    )}
                  </AnimatePresence>
                </div>
                <div
                  className={`absolute z-20 w-full h-full ${
                    isLauncherActive && "pointer-events-none"
                  }`}
                >
                  {stableTabs.map((tab) => (
                    <motion.div
                      key={tab.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: activeTopTab === tab.id ? 1 : 0 }}
                      exit={{
                        opacity: 0,
                        transition: { duration: 0.2 },
                      }}
                      className={`absolute z-40 w-full h-full`}
                    >
                      <Webview
                        tab={tab}
                        isActive={activeTopTab === tab.id}
                        onTitleUpdate={updateTabTitle}
                        onUrlChanged={updateTabUrl}
                        onClose={(id) => closeTab(null, id)}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
