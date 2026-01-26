import {
  app,
  BrowserWindow,
  ipcMain,
  type WebContents,
  webContents,
} from "electron";
import log from "electron-log";
import { channel } from "./channel";

// Track webview webContents and their audio states
const webviewAudioStates = new Map<
  number,
  { isAudible: boolean; isMuted: boolean }
>();

// Track cleanup functions for each webContents
const cleanupFunctions = new Map<number, () => void>();

// Audio polling intervals for each webContents (fallback for Flash content)
const audioPollingIntervals = new Map<number, ReturnType<typeof setInterval>>();

function broadcastAudioState(
  webContentsId: number,
  isAudible: boolean,
  isMuted: boolean,
): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel.webview.audioStateChanged, {
        webContentsId,
        isAudible,
        isMuted,
      });
    }
  });
}

function setupWebContentsAudioTracking(wc: WebContents): void {
  const webContentsId = wc.id;

  // Skip if already tracking
  if (cleanupFunctions.has(webContentsId)) {
    return;
  }

  // Initialize audio state
  webviewAudioStates.set(webContentsId, {
    isAudible: wc.isCurrentlyAudible(),
    isMuted: wc.isAudioMuted(),
  });

  // Handler for audio state changes
  const handleAudioStateChange = (isAudible: boolean) => {
    const state = webviewAudioStates.get(webContentsId);
    if (state && state.isAudible !== isAudible) {
      state.isAudible = isAudible;
      broadcastAudioState(webContentsId, isAudible, state.isMuted);
    }
  };

  // Use type assertion to handle the audio-state-changed event
  // This event exists in Electron but may not be in the type definitions
  const audioStateChangedHandler = (
    _event: Electron.Event,
    audible: boolean,
  ) => {
    handleAudioStateChange(audible);
  };

  (wc as any).on("audio-state-changed", audioStateChangedHandler);

  // Also track media events for Flash content (which might not trigger audio-state-changed)
  const mediaStartedHandler = () => {
    // Small delay to let audio state settle
    setTimeout(() => {
      if (!wc.isDestroyed()) {
        const isAudible = wc.isCurrentlyAudible();
        handleAudioStateChange(isAudible);
      }
    }, 100);
  };

  const mediaPausedHandler = () => {
    // Small delay to check if actually stopped
    setTimeout(() => {
      if (!wc.isDestroyed()) {
        const isAudible = wc.isCurrentlyAudible();
        handleAudioStateChange(isAudible);
      }
    }, 100);
  };

  wc.on("media-started-playing", mediaStartedHandler);
  wc.on("media-paused", mediaPausedHandler);

  // Set up polling for Flash content (Flash doesn't always trigger media events)
  const pollInterval = setInterval(() => {
    if (wc.isDestroyed()) {
      clearInterval(pollInterval);
      audioPollingIntervals.delete(webContentsId);
      return;
    }

    const state = webviewAudioStates.get(webContentsId);
    if (state) {
      const currentlyAudible = wc.isCurrentlyAudible();
      if (currentlyAudible !== state.isAudible) {
        state.isAudible = currentlyAudible;
        broadcastAudioState(webContentsId, currentlyAudible, state.isMuted);
      }
    }
  }, 1000); // Poll every second

  audioPollingIntervals.set(webContentsId, pollInterval);

  // Cleanup when webContents is destroyed
  const destroyedHandler = () => {
    const interval = audioPollingIntervals.get(webContentsId);
    if (interval) {
      clearInterval(interval);
      audioPollingIntervals.delete(webContentsId);
    }
    webviewAudioStates.delete(webContentsId);
    cleanupFunctions.delete(webContentsId);
  };

  wc.once("destroyed", destroyedHandler);

  // Store cleanup function
  cleanupFunctions.set(webContentsId, () => {
    (wc as any).removeListener("audio-state-changed", audioStateChangedHandler);
    wc.removeListener("media-started-playing", mediaStartedHandler);
    wc.removeListener("media-paused", mediaPausedHandler);
    wc.removeListener("destroyed", destroyedHandler);
    const interval = audioPollingIntervals.get(webContentsId);
    if (interval) {
      clearInterval(interval);
      audioPollingIntervals.delete(webContentsId);
    }
    webviewAudioStates.delete(webContentsId);
  });

  log.debug(`[Webview Audio] Tracking webContents ${webContentsId}`);
}

export function registerWebviewHandlers(): void {
  // Listen for new webviews being attached
  app.on("web-contents-created", (_event, wc) => {
    // Check if this is a webview guest
    if (wc.getType() === "webview") {
      setupWebContentsAudioTracking(wc);
    }
  });

  // Handle set audio muted
  ipcMain.handle(
    channel.webview.setAudioMuted,
    async (_event, webContentsId: number, muted: boolean) => {
      try {
        const wc = webContents.fromId(webContentsId);
        if (wc && !wc.isDestroyed()) {
          wc.setAudioMuted(muted);

          const state = webviewAudioStates.get(webContentsId);
          if (state) {
            state.isMuted = muted;
          }

          // Notify all windows of the mute state change
          broadcastAudioState(webContentsId, state?.isAudible ?? false, muted);

          log.debug(
            `[Webview Audio] Set muted=${muted} for webContents ${webContentsId}`,
          );
        }
      } catch (error) {
        log.error("[Webview Audio] Error setting audio muted:", error);
      }
    },
  );

  // Handle get audio state
  ipcMain.handle(
    channel.webview.getAudioState,
    async (_event, webContentsId: number) => {
      try {
        const wc = webContents.fromId(webContentsId);
        if (wc && !wc.isDestroyed()) {
          const state = webviewAudioStates.get(webContentsId) ?? {
            isAudible: wc.isCurrentlyAudible(),
            isMuted: wc.isAudioMuted(),
          };

          return {
            webContentsId,
            isAudible: state.isAudible,
            isMuted: state.isMuted,
          };
        }
        return null;
      } catch (error) {
        log.error("[Webview Audio] Error getting audio state:", error);
        return null;
      }
    },
  );
}
