import fs from "node:fs";
import path from "node:path";
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

export class DiscordRPC {
  private client: Client | null = null;
  private clientId: string | null = null;
  private isReady = false;
  private isConnecting = false;

  get connected(): boolean {
    return this.isReady && this.client !== null;
  }

  get currentClientId(): string | null {
    return this.clientId;
  }

  async connect(clientId: string): Promise<boolean> {
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

    try {
      this.client = new Client({
        clientId,
        transport: { type: "ipc", pathList },
      });

      this.client.on("ready", () => {
        this.isReady = true;
        log.info("[Discord RPC] Connected");
      });

      this.client.on("disconnected", () => {
        this.isReady = false;
        log.info("[Discord RPC] Disconnected");
      });

      await this.client.login();
      return true;
    } catch (error) {
      log.warn("[Discord RPC] Failed to connect:", error);
      this.client = null;
      this.clientId = null;
      return false;
    } finally {
      this.isConnecting = false;
    }
  }

  async setActivity(presence: PresenceData): Promise<void> {
    if (!this.client?.user || !this.isReady) {
      return;
    }

    try {
      await this.client.user.setActivity({
        details: presence.details,
        state: presence.state,
        startTimestamp: presence.startTimestamp,
        largeImageKey: presence.largeImageKey,
        largeImageText: presence.largeImageText,
        smallImageKey: presence.smallImageKey,
        smallImageText: presence.smallImageText,
        buttons: presence.buttons,
        instance: false,
      });
    } catch (error) {
      log.warn("[Discord RPC] Failed to set activity:", error);
    }
  }

  async clearActivity(): Promise<void> {
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
    if (!this.client) {
      return;
    }

    try {
      await this.clearActivity();
      await this.client.destroy();
    } catch (error) {
      log.warn("[Discord RPC] Error during disconnect:", error);
    } finally {
      this.client = null;
      this.clientId = null;
      this.isReady = false;
    }
  }
}
