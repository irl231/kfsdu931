import fs from "node:fs";
import path from "node:path";
import { deepClone, sortKeys } from "@electron/main/utils";
import { Client } from "@xhayper/discord-rpc";
import type { PathData } from "@xhayper/discord-rpc/dist/transport/IPC";
import log from "electron-log";

export interface PresenceData {
  applicationId: string;
  details?: string;
  state?: string;
  startTimestamp?: number;
  largeImageKey?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageText?: string;
  buttons?: Array<{ label: string; url: string }>;
}

// Auto-reconnect configuration
const RECONNECT_CONFIG = {
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds max
  multiplier: 2, // Exponential backoff
  maxAttempts: 10, // Max reconnect attempts before giving up
} as const;

const pathList: PathData[] = [
  {
    platform: ["win32"],
    format: (id: number): string => `\\\\?\\pipe\\discord-ipc-${id}`,
  },
  // MacOS and Linux
  {
    platform: ["darwin", "linux"],
    format: (id: number): string => {
      const {
        env: { XDG_RUNTIME_DIR, TMPDIR, TMP, TEMP },
      } = process;

      const prefix = fs.realpathSync(
        XDG_RUNTIME_DIR ?? TMPDIR ?? TMP ?? TEMP ?? `${path.sep}tmp`,
      );

      return path.join(prefix, `discord-ipc-${id}`);
    },
  },
  // Linux (Snap)
  {
    platform: ["linux"],
    format: (id: number): string => {
      const {
        env: { XDG_RUNTIME_DIR, TMPDIR, TMP, TEMP },
      } = process;

      const prefix = fs.realpathSync(
        XDG_RUNTIME_DIR ?? TMPDIR ?? TMP ?? TEMP ?? `${path.sep}tmp`,
      );
      return path.join(prefix, "snap.discord", `discord-ipc-${id}`);
    },
  },
  // Linux (Flatpak)
  {
    platform: ["linux"],
    format: (id: number): string => {
      const {
        env: { XDG_RUNTIME_DIR, TMPDIR, TMP, TEMP },
      } = process;

      const prefix = fs.realpathSync(
        XDG_RUNTIME_DIR ?? TMPDIR ?? TMP ?? TEMP ?? `${path.sep}tmp`,
      );
      return path.join(
        prefix,
        "app",
        "com.discordapp.Discord",
        `discord-ipc-${id}`,
      );
    },
  },
];

function normalizeActivityForCompare(activity: PresenceData) {
  const copy = deepClone(activity) || {};
  if (copy.startTimestamp) copy.startTimestamp = 0;
  return sortKeys(copy);
}

function isTimestampsDifferent(
  activityA: PresenceData,
  activityB: PresenceData,
): boolean {
  const aStart = activityA?.startTimestamp ?? 0;
  const bStart = activityB?.startTimestamp ?? 0;
  const diff = Math.abs(aStart - bStart);
  return diff >= 2000;
}

export class DiscordRPC {
  private client: Client | null = null;
  private clientId: string | null = null;
  private isReady = false;
  private isConnecting = false;

  // Auto-reconnect state
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect = false;
  private lastPresence: PresenceData | null = null;
  private isManualDisconnect = false;

  get connected(): boolean {
    return this.isReady && this.client !== null;
  }

  get currentClientId(): string | null {
    return this.clientId;
  }

  /**
   * Store presence data for restoration after reconnection.
   * Called before connection attempt to ensure presence is preserved
   * even if the initial connection fails.
   */
  storePresence(presence?: PresenceData): void {
    this.lastPresence = presence || null;
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private getReconnectDelay(): number {
    const delay = Math.min(
      RECONNECT_CONFIG.initialDelay *
        RECONNECT_CONFIG.multiplier ** this.reconnectAttempts,
      RECONNECT_CONFIG.maxDelay,
    );
    return delay;
  }

  private scheduleReconnect(): void {
    // Don't reconnect if manually disconnected or no client ID
    if (this.isManualDisconnect || !this.clientId || !this.shouldReconnect) {
      return;
    }

    // Max attempts reached
    if (this.reconnectAttempts >= RECONNECT_CONFIG.maxAttempts) {
      log.warn("[Discord RPC] Max reconnect attempts reached, giving up");
      this.reconnectAttempts = 0;
      return;
    }

    this.clearReconnectTimer();

    const delay = this.getReconnectDelay();
    log.debug(
      `[Discord RPC] Scheduling reconnect attempt ${this.reconnectAttempts + 1}/${RECONNECT_CONFIG.maxAttempts} in ${delay}ms`,
    );

    this.reconnectTimer = setTimeout(async () => {
      if (!this.shouldReconnect || this.isManualDisconnect) {
        return;
      }

      this.reconnectAttempts++;
      const clientId = this.clientId;

      if (!clientId) {
        return;
      }

      // Reset state for fresh connection attempt
      this.client = null;
      this.isReady = false;

      const success = await this.connect(clientId, true);

      if (success) {
        log.debug("[Discord RPC] Reconnected successfully");
        this.reconnectAttempts = 0;

        // Restore last presence if available
        if (this.lastPresence) {
          await this.setActivity(this.lastPresence);
        }
      } else {
        // Schedule next attempt
        this.scheduleReconnect();
      }
    }, delay);
  }

  async connect(
    clientId: string,
    isReconnectAttempt = false,
  ): Promise<boolean> {
    // Already connected to same client
    if (this.clientId === clientId && this.isReady) {
      return true;
    }

    // Different client - disconnect first
    if (this.client && this.clientId !== clientId) {
      await this.disconnect();
    }

    // Prevent concurrent connection attempts
    if (this.isConnecting) {
      return false;
    }

    this.isConnecting = true;
    this.clientId = clientId;
    this.isManualDisconnect = false;
    this.shouldReconnect = true;

    try {
      this.client = new Client({
        clientId,
        transport: { type: "ipc", pathList },
      });

      this.client.on("ready", () => {
        this.isReady = true;
        this.reconnectAttempts = 0; // Reset on successful connection
        log.debug("[Discord RPC] Connected");
      });

      this.client.on("disconnected", () => {
        const wasReady = this.isReady;
        this.isReady = false;
        this.client = null;
        log.debug("[Discord RPC] Disconnected");

        // Only auto-reconnect if we were previously connected and it's not manual
        if (wasReady && !this.isManualDisconnect && this.shouldReconnect) {
          this.scheduleReconnect();
        }
      });

      await this.client.login();
      return true;
    } catch (error) {
      log.warn("[Discord RPC] Failed to connect:", error);
      this.client = null;
      // Don't reset clientId - keep it for reconnection

      // Schedule reconnect on initial connection failure too (Discord not running)
      if (
        !isReconnectAttempt &&
        this.shouldReconnect &&
        !this.isManualDisconnect
      ) {
        this.scheduleReconnect();
      }

      return false;
    } finally {
      this.isConnecting = false;
    }
  }

  compareActivities(presence: PresenceData): boolean {
    if (!this.lastPresence) return false;
    const a = JSON.stringify(normalizeActivityForCompare(presence));
    const b = JSON.stringify(normalizeActivityForCompare(this.lastPresence));
    return a === b && !isTimestampsDifferent(presence, this.lastPresence);
  }

  async setActivity(presence: PresenceData): Promise<void> {
    // Store presence for reconnection restoration
    this.lastPresence = presence;

    if (!this.client?.user || !this.isReady) {
      return;
    }

    try {
      await this.client.user.setActivity({
        applicationId: presence.applicationId,
        details: presence.details,
        state: presence.state,
        startTimestamp: presence.startTimestamp,
        largeImageKey: presence.largeImageKey,
        largeImageText: presence.largeImageText,
        smallImageKey: presence.smallImageKey,
        smallImageText: presence.smallImageText,
        buttons: presence.buttons,
        instance: true,
      });
    } catch (error) {
      log.warn("[Discord RPC] Failed to set activity:", error);
    }
  }

  async clearActivity(): Promise<void> {
    this.lastPresence = null; // Clear stored presence

    if (!this.client?.user || !this.isReady) {
      return;
    }

    try {
      await this.client.user.clearActivity();
    } catch (error) {
      log.warn("[Discord RPC] Failed to clear activity:", error);
    }
  }

  async disconnect(): Promise<void> {
    // Mark as manual disconnect to prevent auto-reconnect
    this.isManualDisconnect = true;
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;
    this.lastPresence = null;

    if (!this.client) {
      this.clientId = null;
      this.isReady = false;
      return;
    }

    try {
      await this.clearActivity();
      this.client.removeAllListeners();
      await this.client.destroy();
      log.debug("[Discord RPC] Disconnected successfully");
    } catch (error) {
      log.warn("[Discord RPC] Error during disconnect:", error);
    } finally {
      this.client = null;
      this.clientId = null;
      this.isReady = false;
    }
  }
}
