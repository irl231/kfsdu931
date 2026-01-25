import { channel } from "@electron/ipc/channel";
import { contextBridge, type IpcRendererEvent, ipcRenderer } from "electron";

console.log("preload loaded:", window.location.href);

const api: ElectronAPI = {
  getPlatform: () => {
    const platform: AppPlatForm =
      process.platform === "darwin"
        ? "macos"
        : process.platform === "win32"
          ? "windows"
          : "linux";

    return platform;
  },
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
  onDiscordRPCUpdate: (richPresenceOrUrl: Record<string, any> | string) => {
    if (typeof richPresenceOrUrl === "string") {
      return ipcRenderer.send(channel.discordRPC.update, richPresenceOrUrl);
    }
    richPresenceOrUrl.url = window.location.href;
    ipcRenderer.send(channel.discordRPC.update, richPresenceOrUrl);
  },
  onDiscordRPCDestroy: (url?: string) => {
    ipcRenderer.send(channel.discordRPC.destroy, url);
  },
  openExternal: (url: string) =>
    ipcRenderer.invoke(channel.shell.openExternal, url),
};

contextBridge.exposeInMainWorld("electron", api);
