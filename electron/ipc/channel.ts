export const channel = {
  app: {
    getVersion: "app-get-version",
    getName: "app-get-name",
  },
  splash: {
    ready: "splash-ready",
    state: "splash-state",
  },
  store: {
    getSettings: "settings-get",
    setSettings: "settings-set",
    clearSettings: "settings-clear",
    get: "store-get",
    set: "store-set",
    clear: "store-clear",
  },
  window: {
    minimize: "window-minimize",
    toggleMaximize: "window-toggle-maximize",
    close: "window-close",
    maximize: "window-maximize",
    unmaximize: "window-unmaximize",
    isMaximized: "window-is-maximized",
    isFullScreen: "window-is-full-screen",
    enterFullScreen: "window-enter-full-screen",
    leaveFullScreen: "window-leave-full-screen",
  },
  webview: {
    swfReady: "webview-swf-ready",
    openExternal: "webview-open-external",
    closeExternal: "webview-close-external",
  },
  shell: {
    openExternal: "shell-open-external",
  },
  discordRPC: {
    update: "discord-rpc-update",
    destroy: "discord-rpc-destroy",
  },
};
