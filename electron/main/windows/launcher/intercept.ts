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

const socialDomains = [
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "discord.com",
  "discord.gg",
  "reddit.com",
  "linkedin.com",
];

export function handleWebRequestInterceptors(
  windowOrwebContents: BrowserWindow | WebContents,
  domains: string[] = [],
) {
  const isDomainWhitelisted = (
    domain: string,
    anyDomains: string[],
  ): boolean => {
    return [...new Set([...anyDomains, ...WHITELISTED_DOMAINS])].includes(
      domain,
    );
  };

  const webContents =
    windowOrwebContents instanceof BrowserWindow
      ? windowOrwebContents.webContents
      : windowOrwebContents;
  const onBeforeSendHeadersHandlerWeb = async (
    details: OnBeforeSendHeadersListenerDetails,
    callback: (response: { requestHeaders?: Record<string, string> }) => void,
  ) => {
    const headers = details.requestHeaders || {};

    const reqUrl = new URL(details.url.replace(/\/$/, ""));
    const isSalsichaApiVersion = reqUrl.pathname.startsWith("/api/version");

    if (isSalsichaApiVersion) {
      headers["User-Agent"] = `${USER_AGENT} AdobeAIR/50.0`;
      headers["Referer"] = "app:/Desktop/salsicha";
    } else {
      headers["User-Agent"] = USER_AGENT;
    }

    headers["X-Requested-With"] = "ShockwaveFlash/32.0.0.371";

    callback({ requestHeaders: headers });
  };

  const onWillHandler =
    (eventName: string) => (event: WillNavigateEvent, url: string) => {
      const reqUrl = new URL(url.replace(/\/$/, ""));
      const reqTld = parseTLD(reqUrl.hostname);

      if (reqTld.domain && socialDomains.includes(reqTld.domain)) {
        event.preventDefault();
        log.info(`Opening social link in external browser: ${url}`);
        shell.openExternal(url, { activate: true });
        return;
      }

      if (!isDomainWhitelisted(reqTld.domain!, domains)) {
        log.debug(`Blocked ${eventName} to: ${url}`);
        event.preventDefault();
      }
    };

  const onNewWindowHandler = (event: NewWindowEvent, url: string) => {
    const senderUrl = (event as any).sender._getURL().replace(/\/$/, "");
    const reqUrl = new URL(url.replace(/\/$/, ""));
    const reqTld = parseTLD(reqUrl.hostname);
    const parsedSenderUrl = new URL(senderUrl);
    const isSenderFromFile = parsedSenderUrl.protocol === "file:";
    const isSenderFromLocal = parsedSenderUrl.hostname === "localhost";

    event.preventDefault();
    if (
      reqTld.domain === "facebook.com" &&
      reqUrl.searchParams.get("redirect_uri") ===
        "https://game.aq.com/game/AQWFB.html"
    ) {
      return;
    }

    if (reqTld.domain && socialDomains.includes(reqTld.domain)) {
      log.info(`Opening social link in external browser: ${url}`);
      shell.openExternal(url, { activate: true });
      return;
    }

    if (!isDomainWhitelisted(reqTld.domain!, domains)) {
      if (!(isSenderFromFile || isSenderFromLocal)) {
        log.debug(`Blocked new-window to: ${url}`);
        return;
      }
    }

    BrowserWindow.getAllWindows()[0]?.webContents.send(
      channel.webview.openExternal,
      reqUrl.href,
      parsedSenderUrl.href,
    );
  };

  webContents.userAgent = USER_AGENT;
  webContents.on("new-window", onNewWindowHandler as any);
  webContents.on("will-navigate", onWillHandler("navigate") as any);
  webContents.on("will-redirect", onWillHandler("redirect") as any);
  webContents.on("did-attach-webview", (_event, web) => {
    const webviewUrl = new URL((web as any)._getURL().replace(/\/$/, ""));
    const webviewTld = parseTLD(webviewUrl.hostname);

    handleWebRequestInterceptors(web, [webviewTld.domain!]);
  });
  webContents.on("will-attach-webview", (_event, webPreferences, _params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    if (webPreferences.plugins) {
      webPreferences.preload = path.join(__dirname, "preload.cjs");
    }
  });

  webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ["*://*/*"] },
    onBeforeSendHeadersHandlerWeb,
  );
  webContents.session.webRequest.onHeadersReceived(
    ({ responseHeaders, url }, cb) => {
      if (responseHeaders && url.endsWith(".css"))
        responseHeaders["content-type"] = ["text/css"];

      cb({ cancel: false, responseHeaders });
    },
  );
  if (windowOrwebContents instanceof BrowserWindow) {
    const games = GAMES.map((x) => {
      const url = new URL(x.url.game.replace(/\/$/, ""));
      const tld = parseTLD(url.hostname);
      return `${tld.domain}-${url.pathname}`;
    });
    app.on("web-contents-created", (_event, contents) => {
      contents.setUserAgent(USER_AGENT);

      if (contents.getType() === "webview") {
        contents.on("dom-ready", () => {
          const webviewUrl: URL = new URL(contents.getURL().replace(/\/$/, ""));
          const webviewTld = parseTLD(webviewUrl.hostname);
          if (!games.includes(`${webviewTld.domain}-${webviewUrl.pathname}`))
            return;
          contents
            .executeJavaScript(`
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
                    `)
            .then(() =>
              contents.hostWebContents.send(
                channel.webview.swfReady,
                webviewUrl.href,
                contents.id,
              ),
            )
            .catch(() => {});
        });
      }
    });
  }
}
