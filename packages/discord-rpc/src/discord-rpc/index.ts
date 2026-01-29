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

  private activityPayloads: Map<string, ActivityPayload>;
  private lastActivity: ActivityPayload | null;

  private reconnectAttempts = 0;
  private reconnectInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.clientId = null;
    this.client = new Client();
    this.readyResp = null;

    this.activityPayloads = new Map();
    this.lastActivity = null;
  }

  private async scheduleConnect(clientId: string): Promise<void> {
    if (this.reconnectInterval) clearTimeout(this.reconnectInterval);
    this.reconnectAttempts++;
    const delay = Math.min(
      RECONNECT_CONFIG.initialDelay *
        RECONNECT_CONFIG.multiplier ** (this.reconnectAttempts - 1),
      RECONNECT_CONFIG.maxDelay,
    );

    return new Promise((resolve, reject) => {
      this.reconnectInterval = setTimeout(() => {
        if (this.reconnectAttempts >= RECONNECT_CONFIG.maxAttempts) {
          this.reconnectAttempts = 0;
          this.client = null;
          this.readyResp = null;
          reject(new Error("Max reconnect attempts reached"));
          return;
        }

        this.connect(clientId)
          .then(() => {
            if (this.lastActivity) {
              send.info(`Reconnected, setting activity...`);
              this.setActivity(clientId, this.lastActivity!);
            }
            resolve();
          })
          .catch(() => {
            send.warn(`Failed to reconnect, retrying in ${delay}ms...`);
            this.scheduleConnect(clientId);
          });
      }, delay);
    });
  }

  async check() {
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

    ((this.client as any).connection.socket as Socket).on("close", () => {
      send.warn(`Socket closed, reconnecting...`);
      this.scheduleConnect(clientIdOrReconnect);
    });
  }

  async destroy() {
    send.destroyed(this.clientId!);
    await this.client?.destroy();
    this.client = null;
    this.readyResp = null;
    this.lastActivity = null;
    this.activityPayloads.delete(this.clientId!);
  }

  async updateActivity(clientId: string, activity: ActivityPayload) {
    if (this.client === null || this.readyResp === null) {
      await this.scheduleConnect(clientId);
    }

    if (this.compareActivities(activity)) return;
    await this.setActivity(clientId, activity);
  }

  compareActivities(activity: ActivityPayload): boolean {
    if (!this.lastActivity) return false;
    const a = JSON.stringify(normalizeActivityForCompare(activity));
    const b = JSON.stringify(normalizeActivityForCompare(this.lastActivity));
    return a === b && !isTimestampsDifferent(activity, this.lastActivity);
  }

  private async setActivity(clientId: string, activity: ActivityPayload) {
    try {
      this.lastActivity = activity;
      this.activityPayloads.set(clientId, activity);
      await this.client?.setActivity(activity);
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
    await this.client?.clearActivity();
  }
}

const manager = new RPCManager();
let exitInterval: NodeJS.Timeout | null = setTimeout(() => {
  send.error(new Error("There's no client connected to Discord RPC"));
  process.exit(1);
}, 30_000);

Bun.listen({
  hostname: "0.0.0.0",
  port: RPC_PORT,
  socket: {
    async data(_socket, data) {
      if (exitInterval) clearTimeout(exitInterval);
      exitInterval = null;

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
          }
        }
      } catch (error) {
        send.error(error as Error);
      }
    },
    async close() {
      send.warn("Main process closed, exiting...");
      process.exit(0);
    },
  },
});

send.ready();
