import type { AppSettings, DiscordActivity } from "@electron/config";
import type { BrowserTab } from "@web/components/webview";
import { findGameByUrl } from "@web/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parse } from "tldts";
import type { Game } from "../constants";

// Map to track webContentsId to tabId
type WebContentsToTabMap = Map<number, string>;

export function useBrowserTabs() {
  const [browserTabs, setBrowserTabs] = useState<BrowserTab[]>([]);
  const [externalUrls, setExternalUrls] = useState<string[]>([]);
  const [loadingSwfUrls, setLoadingSwfUrls] = useState<string[]>([]);
  const [activeTopTab, setActiveTopTab] = useState("launcher");

  const tabHistoryRef = useRef<string[]>(["launcher"]);
  const webContentsMapRef = useRef<WebContentsToTabMap>(new Map());

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
      window.electron
        .getStore<{
          appSettings?: AppSettings;
        }>("app-settings")
        .then((store) => {
          if (store?.appSettings) {
            const newSettings = {
              ...store.appSettings,
              activeTabURL: undefined,
            };
            window.electron.setStore("app-settings", {
              appSettings: newSettings,
            });
          }
        });
      return;
    }

    const tab = visibleTabs.find((t) => t.id === activeTopTab);
    if (!tab?.url) return;
    const parsedUrl = new URL(tab.url.replace(/\/$/, ""));
    const tabTld = parse(parsedUrl.hostname);
    const game = findGameByUrl(parsedUrl.href);

    window.electron
      .getStore<{
        appSettings?: AppSettings;
      }>("app-settings")
      .then((store) => {
        if (store?.appSettings) {
          const newSettings = { ...store.appSettings, activeTabURL: tab.url };
          window.electron.setStore("app-settings", {
            appSettings: newSettings,
          });
        }
      });

    window.electron
      .getStore<{
        discordActivity?: DiscordActivity;
      }>("discord-activity")
      .then((store) => {
        if (store?.discordActivity) {
          let activityForTab: RichPresencePayload | undefined;
          if (tabTld.domain) {
            for (const [clientId, payload] of Object.entries(
              store.discordActivity,
            )) {
              if (clientId === "default") continue;
              if (payload.url?.includes(tabTld.domain)) {
                activityForTab = { ...payload };
                break;
              }
            }
          }

          if (game && !tab.url.startsWith(game.url.game || "")) {
            activityForTab = {
              id: game.discordId,
              url: tab.url,
              details: "🧭 Browsing",
              state: `🌐 ${parsedUrl.hostname}${parsedUrl.pathname}`,
              partyId: undefined,
              partySize: undefined,
              partyMax: undefined,
              joinSecret: undefined,
              spectateSecret: undefined,
              buttons: [
                {
                  label: "Browse",
                  url: tab.url,
                },
              ],
            };
          }

          if (activityForTab?.id) {
            console.log(
              `[DiscordRPC] Updating presence for tab: ${tab.url}`,
              activityForTab,
            );
            window.electron.onDiscordRPCUpdate(activityForTab);
          } else {
            console.log(
              `[DiscordRPC] No specific presence found for tab, using URL: ${tab.url} which domain is ${tabTld.domain}`,
            );
          }
        }
      });
  }, [activeTopTab, visibleTabs]);

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
                prevTld.domain === senderTld.domain &&
                !x.id.startsWith("external")
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

    const unlisten = window.electron.onWebViewSWFReady((url, id) => {
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

      // Find tabs matching URL that DON'T already have a webContentsId assigned
      // This prevents duplicate URLs from overwriting each other's webContentsId
      const loadedTab = browserTabs.find((x) => {
        // Skip tabs that already have a webContentsId
        if (x.webContentsId !== undefined) return false;

        const parsedPrevUrl = new URL(x.url.replace(/\/$/, ""));
        const prevTld = parse(parsedPrevUrl.hostname);
        return (
          prevTld.domain === tld.domain &&
          parsedPrevUrl.pathname === parsedUrl.pathname
        );
      });

      // Store mapping of webContents ID to browser tab ID
      if (loadedTab) {
        webContentsMapRef.current.set(id, loadedTab.id);
        // Update the tab with the webContentsId
        setBrowserTabs((prev) =>
          prev.map((t) =>
            t.id === loadedTab.id ? { ...t, webContentsId: id } : t,
          ),
        );
      }

      if (loadedTab) setActiveTopTab(loadedTab.id);
    });

    return unlisten;
  }, [browserTabs]);

  // Handle audio state changes from webviews
  useEffect(() => {
    if (!window.electron?.onWebViewAudioStateChanged) return;

    const unlisten = window.electron.onWebViewAudioStateChanged(
      (audioState) => {
        const { webContentsId, isAudible, isMuted } = audioState;

        // Update the tab that has this webContentsId
        // We check directly on the tab's webContentsId property for accuracy
        setBrowserTabs((prev) =>
          prev.map((t) =>
            t.webContentsId === webContentsId
              ? { ...t, isAudible, isMuted }
              : t,
          ),
        );
      },
    );

    return unlisten;
  }, []);

  // Toggle mute for a specific tab
  const toggleMute = useCallback(
    async (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();

      const tab = browserTabs.find((t) => t.id === tabId);
      if (!tab?.webContentsId) return;

      const newMutedState = !tab.isMuted;

      try {
        await window.electron?.setWebViewAudioMuted(
          tab.webContentsId,
          newMutedState,
        );

        // Optimistically update the UI
        setBrowserTabs((prev) =>
          prev.map((t) =>
            t.id === tabId ? { ...t, isMuted: newMutedState } : t,
          ),
        );
      } catch (error) {
        console.error("[BrowserTabs] Error toggling mute:", error);
      }
    },
    [browserTabs],
  );

  const closeTab = useCallback(
    (e: React.MouseEvent | null, tabId: string) => {
      e?.stopPropagation();
      const currentTab = browserTabs.find((t) => t.id === tabId);
      if (!currentTab) return;

      // Clean up the webContentsMap when tab is closed
      if (currentTab.webContentsId !== undefined) {
        webContentsMapRef.current.delete(currentTab.webContentsId);
      }

      const remaining = browserTabs.filter((t) => t.id !== tabId);
      setBrowserTabs(remaining);

      const newHistory = tabHistoryRef.current.filter((id) => id !== tabId);
      tabHistoryRef.current = newHistory;

      if (activeTopTab === tabId) {
        const visibleTabsList = visibleTabs;
        const closedTabIndex = visibleTabsList.findIndex((t) => t.id === tabId);
        const remainingVisible = visibleTabsList.filter((t) => t.id !== tabId);

        let nextTabId: string | null = null;

        const closedTabDomain = parse(currentTab.url).domain;
        const tabsWithSameDomain = remainingVisible.filter((t) => {
          const tDomain = parse(new URL(t.url).hostname).domain;
          return tDomain === closedTabDomain;
        });

        if (tabsWithSameDomain.length <= 0) {
          console.log(
            `[DiscordRPC] Closed last tab of domain ${closedTabDomain}, destroying presence.`,
          );
          window.electron.onDiscordRPCDestroy(currentTab.url);
        }

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

  const updateTabUrl = useCallback(
    (tabId: string, newUrl: string) => {
      // Close tab if URL becomes about:blank (window closed or redirected away)
      if (newUrl === "about:blank") {
        // Clean up webContentsMap for the closing tab
        const tabToClose = browserTabs.find((t) => t.id === tabId);
        if (tabToClose?.webContentsId !== undefined) {
          webContentsMapRef.current.delete(tabToClose.webContentsId);
        }

        setBrowserTabs((prev) => prev.filter((t) => t.id !== tabId));

        // Switch to another tab if the closed tab was active
        if (activeTopTab === tabId) {
          setActiveTopTab("launcher");
        }
        return;
      }

      setBrowserTabs((prev) =>
        prev.map((t) => (t.id === tabId ? { ...t, url: newUrl } : t)),
      );
    },
    [activeTopTab, browserTabs],
  );

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

    const unlisten = window.electron.onWebViewCloseExternal((senderUrl) => {
      console.log(
        "[BrowserTabs] Close external triggered for senderUrl:",
        senderUrl,
      );

      // Find the tab that matches the sender URL
      let tabToClose: string | null = null;

      for (const tab of browserTabs) {
        if (tab.url === senderUrl || tab.url.startsWith(senderUrl)) {
          tabToClose = tab.id;
          console.log(
            "[BrowserTabs] Found matching tab:",
            tabToClose,
            "for URL:",
            senderUrl,
          );
          break;
        }
      }

      // Fallback: close the most recent external tab if no exact match found
      if (!tabToClose) {
        console.log("[BrowserTabs] No exact match found, using fallback");
        const externalTabs = stableTabs.filter((tab) =>
          tab.id.startsWith("external"),
        );
        if (externalTabs.length > 0) {
          tabToClose = externalTabs[externalTabs.length - 1].id;
          console.log("[BrowserTabs] Closing fallback tab:", tabToClose);
        }
      }

      if (tabToClose) {
        closeTab(null, tabToClose);
      }
    });

    return unlisten;
  }, [browserTabs, stableTabs, closeTab]);

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
    toggleMute,
  };
}
