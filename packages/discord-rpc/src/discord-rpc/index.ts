import type { Socket } from "node:net";
import {
  type ActivityPayload,
  Client,
  Event,
  type ReadyResponse,
} from "discord-rpc-new";
import { RPC_PORT } from "../constants";
import { deepClone, sortKeys } from "../utils";
import { send } from "./send";

const RECONNECT_CONFIG = {
  initialDelay: 1000, // 1 second
  maxDelay: 15000, // 15 seconds max
  multiplier: 2, // Exponential backoff
  maxAttempts: 10, // Max reconnect attempts before giving up
} as const;

// Graceful shutdown state
let isShuttingDown = false;

function normalizeActivityForCompare(activity: ActivityPayload) {
  const copy = deepClone(activity) || {};
  if (copy.timestamps?.start) copy.timestamps.start = 0;
  return sortKeys(copy);
}

function isTimestampsDifferent(
  activityA: ActivityPayload,
  activityB: ActivityPayload,
): boolean {
  const aStart = activityA?.timestamps?.start ?? 0;
  const bStart = activityB?.timestamps?.start ?? 0;
  const diff = Math.abs(aStart - bStart);
  return diff >= 2000;
}

class RPCManager {
  private clientId: string | null;
  private client: Client | null;
  private readyResp: ReadyResponse | null;
  private currentSocket: Socket | null = null;

  private activityPayloads: Map<string, ActivityPayload>;
  private lastActivity: ActivityPayload | null;

  private reconnectAttempts = 0;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private isSwitchingClient = false;

  constructor() {
    this.clientId = null;
    this.client = new Client();
    this.readyResp = null;
    this.currentSocket = null;

    this.activityPayloads = new Map();
    this.lastActivity = null;
  }

  private async scheduleConnect(clientId: string): Promise<void> {
    if (isShuttingDown) return;
    if (this.isReconnecting) {
      send.info(`Already reconnecting, skipping duplicate request`);
      return;
    }

    this.isReconnecting = true;

    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      RECONNECT_CONFIG.initialDelay *
        RECONNECT_CONFIG.multiplier ** (this.reconnectAttempts - 1),
      RECONNECT_CONFIG.maxDelay,
    );

    return new Promise((resolve, reject) => {
      this.reconnectInterval = setTimeout(async () => {
        if (isShuttingDown) {
          this.isReconnecting = false;
          resolve();
          return;
        }
        if (this.reconnectAttempts >= RECONNECT_CONFIG.maxAttempts) {
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          this.client = null;
          this.readyResp = null;
          reject(new Error("Max reconnect attempts reached"));
          return;
        }

        try {
          await this.connect(clientId);
          this.isReconnecting = false;
          if (this.lastActivity) {
            send.info(`Reconnected, setting activity...`);
            await this.setActivity(clientId, this.lastActivity!);
          }
          resolve();
        } catch (_error) {
          this.isReconnecting = false;
          send.warn(`Failed to reconnect, retrying in ${delay}ms...`);
          try {
            await this.scheduleConnect(clientId);
            resolve();
          } catch (e) {
            reject(e);
          }
        }
      }, delay);
    });
  }

  async check() {
    if (isShuttingDown) return;
    if (this.client && this.readyResp) return;
    if (this.clientId && this.lastActivity) {
      send.info(`Has activity, reconnecting...`);
      this.updateActivity(this.clientId!, this.lastActivity);
    }
  }

  async connect(clientId: string): Promise<void>;
  async connect(reconnect: true): Promise<void>;
  async connect(clientId: string, autoReconnect?: true): Promise<void>;
  async connect(
    clientIdOrReconnect: string | true,
    autoReconnect?: true,
  ): Promise<void> {
    if (isShuttingDown) return;

    if (typeof clientIdOrReconnect === "string" && autoReconnect) {
      return this.scheduleConnect(clientIdOrReconnect);
    }

    if (typeof clientIdOrReconnect === "boolean") {
      if (!this.clientId) return;
      return this.connect(this.clientId, true);
    }

    this.clientId = clientIdOrReconnect;
    this.client = new Client();
    this.client.on(Event.ERROR, (error) => {
      send.error(error as Error);
      this.destroy();
    });

    this.readyResp = await this.client.login({ clientId: clientIdOrReconnect });

    // Clean up previous socket listeners
    if (this.currentSocket) {
      this.currentSocket.removeAllListeners();
      this.currentSocket = null;
    }

    const socket = (this.client as any).connection?.socket as
      | Socket
      | undefined;
    if (socket) {
      this.currentSocket = socket;

      socket.on("close", () => {
        // Use this.clientId to get current clientId, not closure
        if (!isShuttingDown && !this.isSwitchingClient && this.clientId) {
          send.warn(`Socket closed, reconnecting...`);
          this.reconnectAttempts = 0;
          this.scheduleConnect(this.clientId);
        }
      });
      socket.on("error", (err) => {
        send.error(err);
      });
    }
  }

  async destroy() {
    // Clear reconnect timer first
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
    this.reconnectAttempts = 0;
    this.isReconnecting = false;

    // Clean up socket listeners BEFORE destroying
    if (this.currentSocket) {
      this.currentSocket.removeAllListeners();
      this.currentSocket = null;
    }

    if (this.clientId) {
      send.destroyed(this.clientId);
    }

    try {
      await this.client?.destroy();
    } catch {
      // Ignore destroy errors during shutdown
    }

    this.client = null;
    this.readyResp = null;
    this.lastActivity = null;
    if (this.clientId) {
      this.activityPayloads.delete(this.clientId);
    } else {
      this.activityPayloads.clear();
    }
  }

  async updateActivity(clientId: string, activity: ActivityPayload) {
    if (isShuttingDown) return;

    const needsClientSwitch =
      typeof this.clientId === "string" &&
      typeof clientId === "string" &&
      this.clientId !== clientId;

    if (needsClientSwitch) {
      send.info(`Client ID changed, reconnecting...`);
      // Set flag to prevent socket close handler from triggering reconnect
      this.isSwitchingClient = true;

      // Store the activity before destroying
      const activityToRestore = activity;

      await this.destroy();

      // Set the new clientId BEFORE scheduleConnect
      this.clientId = clientId;
      this.lastActivity = activityToRestore;

      // Reset flag
      this.isSwitchingClient = false;
    }

    if (this.client === null || this.readyResp === null) {
      // Ensure clientId is set before scheduling connect
      this.clientId = clientId;
      await this.scheduleConnect(clientId);
    }

    if (this.compareActivities(activity)) return;
    await this.setActivity(clientId, activity);
  }

  compareActivities(activity: ActivityPayload): boolean {
    if (!this.lastActivity) return false;
    // Check timestamps first (fast path)
    if (isTimestampsDifferent(activity, this.lastActivity)) return false;
    // Then compare normalized payloads
    const a = normalizeActivityForCompare(activity);
    const b = normalizeActivityForCompare(this.lastActivity);
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private async setActivity(clientId: string, activity: ActivityPayload) {
    if (isShuttingDown) return;

    try {
      this.lastActivity = activity;
      this.activityPayloads.set(clientId, activity);
      await this.client?.setActivity(activity);
      send.info(`Activity set: ${JSON.stringify(activity)}`);
    } catch (error) {
      send.error(error as Error);
    }
  }

  async clearActivity(clientId?: string) {
    if (clientId) {
      this.activityPayloads.delete(clientId);
    } else {
      this.activityPayloads.clear();
    }

    this.lastActivity = null;
    try {
      await this.client?.clearActivity();
    } catch {
      // Ignore errors during clear
    }
  }
}

const manager = new RPCManager();
let exitInterval: NodeJS.Timeout | null = setTimeout(() => {
  send.error(new Error("No client connected within 30s"));
  gracefulShutdown(1);
}, 30_000);

const server = Bun.listen({
  hostname: "0.0.0.0",
  port: RPC_PORT,
  socket: {
    async data(_socket, data) {
      if (isShuttingDown) return;

      if (exitInterval) {
        clearTimeout(exitInterval);
        exitInterval = null;
      }

      let json: Record<string, unknown>;
      try {
        json = JSON.parse(data.toString());
      } catch {
        return;
      }

      try {
        switch (json.action) {
          case "update": {
            const clientId = json.clientId as string;
            const payload = json.payload as ActivityPayload;
            await manager.updateActivity(clientId, payload);
            break;
          }
          case "clear": {
            const clientId = json.clientId as string;
            await manager.clearActivity(clientId);
            break;
          }
          case "disconnect": {
            const clientId = json.clientId as string;
            await manager.clearActivity(clientId);
            await manager.destroy();
            break;
          }
          case "reconnect": {
            await manager.check();
            break;
          }
        }
      } catch (error) {
        send.error(error as Error);
      }
    },
    async close() {
      send.warn("Client socket closed, shutting down...");
      await gracefulShutdown(0);
    },
  },
});

// Graceful shutdown function
async function gracefulShutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  send.info("Graceful shutdown initiated...");

  // Clear exit timeout
  if (exitInterval) {
    clearTimeout(exitInterval);
    exitInterval = null;
  }

  // Destroy RPC client
  try {
    await manager.destroy();
  } catch {
    // Ignore errors during shutdown
  }

  // Stop the server
  try {
    server.stop();
  } catch {
    // Ignore errors during shutdown
  }

  process.exit(code);
}

// Handle process signals for graceful shutdown
process.on("SIGINT", () => gracefulShutdown(0));
process.on("SIGTERM", () => gracefulShutdown(0));
process.on("SIGHUP", () => gracefulShutdown(0));

send.ready();
