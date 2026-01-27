import { channel } from "@electron/ipc/channel";
import { contextBridge, type IpcRendererEvent, ipcRenderer } from "electron";

// Use environment check instead of console.log for production
if (process.env.NODE_ENV === "development") {
  console.log("preload loaded:", window.location.href);
}

// Cache platform to avoid repeated process.platform checks
const cachedPlatform: AppPlatForm =
  process.platform === "darwin"
    ? "macos"
    : process.platform === "win32"
      ? "windows"
      : "linux";

const api: ElectronAPI = {
  getPlatform: () => cachedPlatform,
  getAppVersion: () => ipcRenderer.invoke(channel.app.getVersion),
  getAppName: () => ipcRenderer.invoke(channel.app.getName),
  splashReady: () => ipcRenderer.send(channel.splash.ready),
  onSplashState: (cb) => {
    const splashMessageHandler = (
      _event: IpcRendererEvent,
      message: string,
      isLoading?: boolean,
      progress?: number,
    ) => {
      cb(message, isLoading, progress);
    };
    ipcRenderer.on(channel.splash.state, splashMessageHandler);

    return () => {
      ipcRenderer.removeListener(channel.splash.state, splashMessageHandler);
    };
  },
  getStore: (name: StoreName) => ipcRenderer.invoke(channel.store.get, name),
  setStore: (name: StoreName, value: any) =>
    ipcRenderer.invoke(channel.store.set, name, value),
  clearStore: (name: StoreName) =>
    ipcRenderer.invoke(channel.store.clear, name),
  minimizeWindow: () => ipcRenderer.send(channel.window.minimize),
  toggleMaximizeWindow: () => ipcRenderer.send(channel.window.toggleMaximize),
  closeWindow: () => ipcRenderer.send(channel.window.close),
  isMaximized: () => ipcRenderer.invoke(channel.window.isMaximized),
  onWindowMaximizeChange: (cb) => {
    const maximizeHandler = () => cb(true);
    const unmaximizeHandler = () => cb(false);

    ipcRenderer.on(channel.window.maximize, maximizeHandler);
    ipcRenderer.on(channel.window.unmaximize, unmaximizeHandler);

    return () => {
      ipcRenderer.removeListener(channel.window.maximize, maximizeHandler);
      ipcRenderer.removeListener(channel.window.unmaximize, unmaximizeHandler);
    };
  },
  isFullScreen: () => ipcRenderer.invoke(channel.window.isFullScreen),
  onWebViewSWFReady: (cb) => {
    const swfReadyHandler = (
      _event: IpcRendererEvent,
      url: string,
      id: number,
    ) => {
      cb(url, id);
    };
    ipcRenderer.on(channel.webview.swfReady, swfReadyHandler);

    return () => {
      ipcRenderer.removeListener(channel.webview.swfReady, swfReadyHandler);
    };
  },
  onWebViewOpenExternal: (cb) => {
    const openExternalHandler = (
      _event: IpcRendererEvent,
      url: string,
      senderUrl: string,
    ) => {
      cb(url, senderUrl);
    };
    ipcRenderer.on(channel.webview.openExternal, openExternalHandler);

    return () => {
      ipcRenderer.removeListener(
        channel.webview.openExternal,
        openExternalHandler,
      );
    };
  },
  onWebViewCloseExternal: (cb: (senderUrl: string) => void) => {
    const closeExternalHandler = (
      _event: IpcRendererEvent,
      senderUrl: string,
    ) => {
      cb(senderUrl);
    };
    ipcRenderer.on(channel.webview.closeExternal, closeExternalHandler);

    return () => {
      ipcRenderer.removeListener(
        channel.webview.closeExternal,
        closeExternalHandler,
      );
    };
  },
  onWindowFullScreenChange: (cb) => {
    const enterFullScreenHandler = () => cb(true);
    const leaveFullScreenHandler = () => cb(false);

    ipcRenderer.on(channel.window.enterFullScreen, enterFullScreenHandler);
    ipcRenderer.on(channel.window.leaveFullScreen, leaveFullScreenHandler);

    return () => {
      ipcRenderer.removeListener(
        channel.window.enterFullScreen,
        enterFullScreenHandler,
      );
      ipcRenderer.removeListener(
        channel.window.leaveFullScreen,
        leaveFullScreenHandler,
      );
    };
  },
  onWebViewAudioStateChanged: (cb) => {
    const audioStateHandler = (
      _event: IpcRendererEvent,
      audioState: AudioState,
    ) => {
      cb(audioState);
    };
    ipcRenderer.on(channel.webview.audioStateChanged, audioStateHandler);

    return () => {
      ipcRenderer.removeListener(
        channel.webview.audioStateChanged,
        audioStateHandler,
      );
    };
  },
  setWebViewAudioMuted: (webContentsId: number, muted: boolean) =>
    ipcRenderer.invoke(channel.webview.setAudioMuted, webContentsId, muted),
  getWebViewAudioState: (webContentsId: number) =>
    ipcRenderer.invoke(channel.webview.getAudioState, webContentsId),
  onDiscordRPCUpdate: (richPresenceOrUrl: RichPresencePayload) => {
    const url = window.location.href;
    const presence = {
      ...richPresenceOrUrl,
      ...(!(url.includes("localhost") || url.startsWith("file://"))
        ? { url }
        : {}),
    };
    ipcRenderer.send(channel.discordRPC.update, presence);
  },
  onDiscordRPCDestroy: (url?: string) => {
    ipcRenderer.send(channel.discordRPC.destroy, url);
  },
  openExternal: (url: string) =>
    ipcRenderer.invoke(channel.shell.openExternal, url),
};

// Expose API to renderer with error handling
try {
  contextBridge.exposeInMainWorld("electron", api);
} catch (error) {
  console.error("Failed to expose Electron API:", error);
}
