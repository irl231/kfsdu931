import type { BrowserTab } from "@web/components/webview";
import { findGameByUrl } from "@web/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parse } from "tldts";
import type { Game } from "../constants";

export function useBrowserTabs() {
  const [browserTabs, setBrowserTabs] = useState<BrowserTab[]>([]);
  const [externalUrls, setExternalUrls] = useState<string[]>([]);
  const [loadingSwfUrls, setLoadingSwfUrls] = useState<string[]>([]);
  const [activeTopTab, setActiveTopTab] = useState("launcher");

  const tabHistoryRef = useRef<string[]>(["launcher"]);

  // Optimize sorting: only sort when browserTabs changes
  const stableTabs = useMemo(
    () => [...browserTabs].sort((a, b) => a.createdAt - b.createdAt),
    [browserTabs],
  );

  // Use Set for O(1) lookup instead of includes() which is O(n)
  const loadingUrlsSet = useMemo(
    () => new Set(loadingSwfUrls),
    [loadingSwfUrls],
  );

  const visibleTabs = useMemo(
    () => browserTabs.filter((tab) => !loadingUrlsSet.has(tab.url)),
    [browserTabs, loadingUrlsSet],
  );

  const hiddenTabs = useMemo(
    () => browserTabs.filter((tab) => loadingUrlsSet.has(tab.url)),
    [browserTabs, loadingUrlsSet],
  );

  useEffect(() => {
    const history = tabHistoryRef.current.filter((id) => id !== activeTopTab);
    history.push(activeTopTab);
    tabHistoryRef.current = history;
  }, [activeTopTab]);

  // handle Discord RPC updates
  useEffect(() => {
    if (activeTopTab === "launcher") {
      if (browserTabs.length <= 0) window.electron.onDiscordRPCDestroy();
      return;
    }

    const tab = browserTabs.find((t) => t.id === activeTopTab);
    if (!tab?.url) return;

    window.electron
      .getStore<{ appSettings?: Record<string, unknown> }>("app-settings")
      .then((store) => {
        if (store?.appSettings) {
          const newSettings = { ...store.appSettings, activeTabURL: tab.url };
          window.electron.setStore("app-settings", {
            appSettings: newSettings,
          });
        }
      });

    window.electron.onDiscordRPCUpdate(tab.url);
  }, [activeTopTab, browserTabs]);

  // handle external URL opens
  useEffect(() => {
    if (!window.electron) return;

    const unlisten = window.electron.onWebViewOpenExternal((url, senderUrl) => {
      try {
        setExternalUrls((prev) => [...prev, url]);

        const parsedUrl = new URL(url.replace(/\/$/, ""));

        // Handle empty or invalid sender URL
        let parsedSenderUrl: URL | null = null;
        let senderTld: ReturnType<typeof parse> | null = null;

        if (senderUrl?.trim()) {
          try {
            parsedSenderUrl = new URL(senderUrl.replace(/\/$/, ""));
            senderTld = parse(parsedSenderUrl.hostname);
          } catch (_error) {
            console.warn("[BrowserTabs] Invalid sender URL:", senderUrl);
          }
        }

        const referenceTab = senderTld
          ? browserTabs.find((x) => {
              const parsedPrevUrl = new URL(x.url.replace(/\/$/, ""));
              const prevTld = parse(parsedPrevUrl.hostname);
              return (
                prevTld.domain === senderTld.domain && !x.id.startsWith("external")
              );
            })
          : undefined;

        // Use game lookup utility for O(1) lookup
        const game = findGameByUrl(parsedUrl.href);
        const accent = referenceTab?.accent || game?.accent || "#ffffff";

        const refId = referenceTab?.id || "unknown";
        const newTab: BrowserTab = {
          url: parsedUrl.href,
          accent,
          createdAt: Date.now(),
          title: "Loading...",
          id: `external-${refId}-${externalUrls.length + 1}`,
        };

        setBrowserTabs((prev) => [...prev, newTab]);
        setActiveTopTab(newTab.id);
      } catch (error) {
        console.error("[BrowserTabs] Error handling external URL:", error);
      }
    });

    return unlisten;
  }, [externalUrls.length, browserTabs, externalUrls]);

  // handle SWF ready events
  useEffect(() => {
    if (!window.electron) return;

    const unlisten = window.electron.onWebViewSWFReady((url) => {
      const parsedUrl = new URL(url.replace(/\/$/, ""));
      const tld = parse(parsedUrl.hostname);

      setLoadingSwfUrls((prevUrls) =>
        prevUrls.filter((prevUrl) => {
          const parsedPrevUrl = new URL(prevUrl.replace(/\/$/, ""));
          const prevTld = parse(parsedPrevUrl.hostname);
          return !(
            prevTld.domain === tld.domain &&
            parsedPrevUrl.pathname === parsedUrl.pathname
          );
        }),
      );

      const loadedTab = browserTabs.find((x) => {
        const parsedPrevUrl = new URL(x.url.replace(/\/$/, ""));
        const prevTld = parse(parsedPrevUrl.hostname);
        return (
          prevTld.domain === tld.domain &&
          parsedPrevUrl.pathname === parsedUrl.pathname
        );
      });

      if (loadedTab) setActiveTopTab(loadedTab.id);
    });

    return unlisten;
  }, [browserTabs]);

  const closeTab = useCallback(
    (e: React.MouseEvent | null, tabId: string) => {
      e?.stopPropagation();
      const currentTab = browserTabs.find((t) => t.id === tabId);
      if (!currentTab) return;

      const remaining = browserTabs.filter((t) => t.id !== tabId);
      setBrowserTabs(remaining);

      const newHistory = tabHistoryRef.current.filter((id) => id !== tabId);
      tabHistoryRef.current = newHistory;

      if (activeTopTab === tabId) {
        window.electron.onDiscordRPCDestroy(currentTab.url);

        const visibleTabsList = visibleTabs;
        const closedTabIndex = visibleTabsList.findIndex((t) => t.id === tabId);
        const remainingVisible = visibleTabsList.filter((t) => t.id !== tabId);

        let nextTabId: string | null = null;

        if (remainingVisible.length > 0) {
          if (closedTabIndex > 0)
            nextTabId = visibleTabsList[closedTabIndex - 1].id;
          else nextTabId = remainingVisible[0].id;
        }

        setActiveTopTab(nextTabId || "launcher");
      }
    },
    [browserTabs, activeTopTab, visibleTabs],
  );

  const handleReorder = useCallback(
    (newOrder: BrowserTab[]) => {
      setBrowserTabs([...newOrder, ...hiddenTabs]);
    },
    [hiddenTabs],
  );

  const playGame = useCallback(
    (game: Game) => {
      const existing = browserTabs.find((t) => t.id === game.id);
      if (existing) {
        setActiveTopTab(game.id);
        return;
      }

      const newTab: BrowserTab = {
        id: game.id,
        title: game.name,
        url: game.url.game,
        accent: game.accent,
        createdAt: Date.now(),
      };

      setLoadingSwfUrls((prev) => [...prev, game.url.game]);
      setBrowserTabs((prev) => [...prev, newTab]);
    },
    [browserTabs],
  );

  const updateTabTitle = useCallback((tabId: string, newTitle: string) => {
    setBrowserTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, title: newTitle } : t)),
    );
  }, []);

  const updateTabUrl = useCallback((tabId: string, newUrl: string) => {
    setBrowserTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, url: newUrl } : t)),
    );
  }, []);

  const isGameLoading = useCallback(
    (gameUrl: string) => loadingUrlsSet.has(gameUrl),
    [loadingUrlsSet],
  );

  const isGameOpen = useCallback(
    (gameUrl: string) => browserTabs.some((x) => x.url === gameUrl),
    [browserTabs],
  );

  // handle external tab close signals (when social media links are opened)
  useEffect(() => {
    if (!window.electron) return;

    const unlisten = window.electron.onWebViewCloseExternal((_tabId) => {
      // The tabId passed from main process is the webview's content ID
      // We need to close any tab that was initiated from that webview
      // For now, close the most recent external tab as a heuristic
      const externalTabs = stableTabs.filter((tab) => tab.id.startsWith("external"));
      if (externalTabs.length > 0) {
        // Close the most recent external tab (last one opened)
        closeTab(null, externalTabs[externalTabs.length - 1].id);
      }
    });

    return unlisten;
  }, [stableTabs, closeTab]);

  return {
    browserTabs,
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
  };
}
