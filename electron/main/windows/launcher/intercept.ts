import path from "node:path";
import { USER_AGENT, WHITELISTED_DOMAINS } from "@electron/config";
import { channel } from "@electron/ipc/channel";
import { GAMES } from "@web/pages/launcher/constants";
import {
  app,
  BrowserWindow,
  type NewWindowEvent,
  type OnBeforeSendHeadersListenerDetails,
  shell,
  type WebContents,
  type WillNavigateEvent,
} from "electron";
import log from "electron-log";
import { parse as parseTLD } from "tldts";

// Use Set for O(1) lookups instead of array
const SOCIAL_DOMAINS = new Set([
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "discord.com",
  "discord.gg",
  "reddit.com",
  "linkedin.com",
]);

// Constants for special cases
const FACEBOOK_REDIRECT_URI = "https://game.aq.com/game/AQWFB.html";
const SALSICHA_USER_AGENT = `${USER_AGENT} AdobeAIR/50.0`;
const FLASH_HEADER = "ShockwaveFlash/32.0.0.371";

// Cache for parsed game IDs
const gameIdsCache = new Set(
  GAMES.map((x) => {
    const url = new URL(x.url.game.replace(/\/$/, ""));
    const tld = parseTLD(url.hostname);
    return `${tld.domain}-${url.pathname}`;
  }),
);

// Helper: Safe URL parsing with error handling
function safeParseUrl(url: string): URL | null {
  try {
    // Return null for empty or whitespace-only URLs without logging
    if (!url || !url.trim()) {
      return null;
    }
    return new URL(url.replace(/\/$/, ""));
  } catch (_error) {
    log.debug("[Intercept] Invalid URL:", url);
    return null;
  }
}

// Helper: Check if domain is social media
function isSocialDomain(domain: string | undefined): boolean {
  return domain ? SOCIAL_DOMAINS.has(domain) : false;
}

export function handleWebRequestInterceptors(
  windowOrwebContents: BrowserWindow | WebContents,
  domains: string[] = [],
) {
  // Memoized whitelist set for performance
  const whitelistSet = new Set([...domains, ...WHITELISTED_DOMAINS]);

  const isDomainWhitelisted = (domain: string | undefined): boolean => {
    return domain ? whitelistSet.has(domain) : false;
  };

  const webContents =
    windowOrwebContents instanceof BrowserWindow
      ? windowOrwebContents.webContents
      : windowOrwebContents;

  const onBeforeSendHeadersHandlerWeb = async (
    details: OnBeforeSendHeadersListenerDetails,
    callback: (response: { requestHeaders?: Record<string, string> }) => void,
  ) => {
    try {
      const headers = { ...details.requestHeaders };
      const reqUrl = safeParseUrl(details.url);

      if (!reqUrl) {
        callback({ requestHeaders: headers });
        return;
      }

      const isSalsichaApiVersion = reqUrl.pathname.startsWith("/api/version");

      if (isSalsichaApiVersion) {
        headers["User-Agent"] = SALSICHA_USER_AGENT;
        headers["Referer"] = "app:/Desktop/salsicha";
      } else {
        headers["User-Agent"] = USER_AGENT;
      }

      headers["X-Requested-With"] = FLASH_HEADER;

      callback({ requestHeaders: headers });
    } catch (error) {
      log.error("[Intercept] Error in headers handler:", error);
      callback({ requestHeaders: details.requestHeaders });
    }
  };

  // Helper: Open external URL safely and close the initiating tab
  const openExternalAndCloseTab = async (
    url: string,
    reason: string,
    senderUrlForClose?: string,
  ): Promise<void> => {
    try {
      log.info(`[Intercept] ${reason}: ${url}`);
      await shell.openExternal(url, { activate: true });

      // Send close signal with sender URL for identification
      if (senderUrlForClose) {
        log.info(
          `[Intercept] Sending close signal for sender: ${senderUrlForClose}`,
        );
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow && !mainWindow.isDestroyed()) {
          // Send close signal with a small delay to ensure external app opens first
          setTimeout(() => {
            if (!mainWindow.isDestroyed()) {
              log.info(`[Intercept] Sending closeExternal IPC message`);
              mainWindow.webContents.send(
                channel.webview.closeExternal,
                senderUrlForClose,
              );
            }
          }, 100);
        } else {
          log.warn(`[Intercept] Main window not available for close signal`);
        }
      } else {
        log.debug(`[Intercept] No sender URL provided for closing`);
      }
    } catch (error) {
      log.error(`[Intercept] Error opening external URL:`, error);
    }
  };

  const onWillHandler =
    (eventName: string) => (event: WillNavigateEvent, url: string) => {
      try {
        const reqUrl = safeParseUrl(url);
        if (!reqUrl) {
          event.preventDefault();
          return;
        }

        const reqTld = parseTLD(reqUrl.hostname);

        if (reqTld.domain && isSocialDomain(reqTld.domain)) {
          event.preventDefault();
          // Get the sender URL to identify which tab initiated this
          const senderUrl = (event as any).sender?._getURL?.();
          openExternalAndCloseTab(
            url,
            "Opening social link in external browser",
            senderUrl,
          );
          return;
        }

        if (reqTld.domain && !isDomainWhitelisted(reqTld.domain)) {
          log.debug(`[Intercept] Blocked ${eventName} to: ${url}`);
          event.preventDefault();
        }
      } catch (error) {
        log.error(`[Intercept] Error in ${eventName} handler:`, error);
        event.preventDefault();
      }
    };

  const onNewWindowHandler = (event: NewWindowEvent, url: string) => {
    event.preventDefault();

    try {
      // Early validation: check if URL is empty or invalid
      if (!url || !url.trim()) {
        log.debug(`[Intercept] Blocked new-window with empty URL`);
        return;
      }

      const senderUrl = (event as any).sender._getURL().replace(/\/$/, "");
      const reqUrl = safeParseUrl(url);
      const parsedSenderUrl = safeParseUrl(senderUrl);

      if (!reqUrl) {
        log.warn(`[Intercept] Invalid URL in new-window handler: ${url}`);
        return;
      }

      if (!parsedSenderUrl && senderUrl) {
        log.warn(
          `[Intercept] Invalid sender URL in new-window handler: ${senderUrl}`,
        );
        return;
      }

      const reqTld = parseTLD(reqUrl.hostname);
      const isSenderFromFile = parsedSenderUrl?.protocol === "file:";
      const isSenderFromLocal = parsedSenderUrl?.hostname === "localhost";

      // Special case: Facebook redirect for AQW
      if (
        reqTld.domain === "facebook.com" &&
        reqUrl.searchParams.get("redirect_uri") === FACEBOOK_REDIRECT_URI
      ) {
        return;
      }

      // Handle social media links
      if (reqTld.domain && isSocialDomain(reqTld.domain)) {
        openExternalAndCloseTab(
          url,
          "Opening social link in external browser",
          senderUrl,
        );
        return;
      }

      // Check whitelist
      if (reqTld.domain && !isDomainWhitelisted(reqTld.domain)) {
        if (!(isSenderFromFile || isSenderFromLocal)) {
          log.debug(
            `[Intercept] Blocked new-window to: ${url}`,
            parsedSenderUrl,
          );
          return;
        }
      }

      // Send to main window
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(
          channel.webview.openExternal,
          reqUrl.href,
          parsedSenderUrl?.href || "",
        );
      } else {
        log.warn(`[Intercept] No main window available for external open`);
      }
    } catch (error) {
      log.error(`[Intercept] Error in new-window handler:`, error);
    }
  };

  // Set user agent
  webContents.userAgent = USER_AGENT;

  // Attach event handlers
  webContents.on("new-window", onNewWindowHandler as any);
  webContents.on("will-navigate", onWillHandler("navigate") as any);
  webContents.on("will-redirect", onWillHandler("redirect") as any);

  webContents.on("did-attach-webview", (_event, web) => {
    try {
      const webviewUrl = safeParseUrl(
        (web as any)._getURL?.()?.replace?.(/\/$/, "") || "",
      );
      if (!webviewUrl) return;

      const webviewTld = parseTLD(webviewUrl.hostname);
      if (webviewTld.domain) {
        handleWebRequestInterceptors(web, [webviewTld.domain]);
      }
    } catch (error) {
      log.error(`[Intercept] Error in did-attach-webview:`, error);
    }
  });

  webContents.on("will-attach-webview", (_event, webPreferences, _params) => {
    try {
      delete webPreferences.preload;
      webPreferences.nodeIntegration = false;
      if (webPreferences.plugins) {
        webPreferences.preload = path.join(__dirname, "preload.cjs");
      }
    } catch (error) {
      log.error(`[Intercept] Error in will-attach-webview:`, error);
    }
  });

  // Session request handlers
  webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ["*://*/*"] },
    onBeforeSendHeadersHandlerWeb,
  );

  webContents.session.webRequest.onHeadersReceived(
    ({ responseHeaders, url }, cb) => {
      try {
        if (responseHeaders && url.endsWith(".css")) {
          responseHeaders["content-type"] = ["text/css"];
        }
        cb({ cancel: false, responseHeaders });
      } catch (error) {
        log.error(`[Intercept] Error in headers received:`, error);
        cb({ cancel: false, responseHeaders });
      }
    },
  );

  // Handle webview injection for BrowserWindow only
  if (windowOrwebContents instanceof BrowserWindow) {
    app.on("web-contents-created", (_event, contents) => {
      try {
        contents.setUserAgent(USER_AGENT);

        if (contents.getType() === "webview") {
          contents.on("dom-ready", () => {
            try {
              const webviewUrl = safeParseUrl(contents.getURL());
              if (!webviewUrl) return;

              const webviewTld = parseTLD(webviewUrl.hostname);
              const gameId = `${webviewTld.domain}-${webviewUrl.pathname}`;

              if (!gameIdsCache.has(gameId)) return;

              // Inject SWF styling and Discord RPC handlers
              contents
                .executeJavaScript(getSWFInjectionScript())
                .then(() => {
                  if (
                    contents.hostWebContents &&
                    !contents.hostWebContents.isDestroyed()
                  ) {
                    contents.hostWebContents.send(
                      channel.webview.swfReady,
                      webviewUrl.href,
                      contents.id,
                    );
                  }
                })
                .catch((error) => {
                  log.error(`[Intercept] Error injecting SWF script:`, error);
                });
            } catch (error) {
              log.error(`[Intercept] Error in dom-ready handler:`, error);
            }
          });
        }
      } catch (error) {
        log.error(`[Intercept] Error in web-contents-created:`, error);
      }
    });
  }
}

// Extracted SWF injection script for better maintainability
function getSWFInjectionScript(): string {
  return `
    const setLoaderReady = () => document.getElementById("play-game").setDiscordRPCReady();
    const onDiscordRPC = (rpc) => window.electron.onDiscordRPCUpdate(rpc);

    (() => {
      const checkSWF = () => {
        const swf = document.querySelector('embed[src*=".swf"], object[data*=".swf"]');
        if (swf) {
          const style = document.createElement('style');
          style.innerHTML = \`
            html, body {
              overflow: hidden !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: 100% !important;
            }

            body > *:not(embed):not(object) {
              visibility: hidden !important;
            }

            embed[src*=".swf"], object[data*=".swf"] {
              visibility: visible !important;
              position: fixed !important;
              top: 0 !important;
              left: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              z-index: 2147483647 !important;
              display: block !important;
            }
          \`;

          (document.head || document.documentElement).appendChild(style);
          return true;
        }
        requestAnimationFrame(checkSWF);
      };
      checkSWF();
    })();
  `;
}
