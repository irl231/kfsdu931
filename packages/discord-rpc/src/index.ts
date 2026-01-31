import { spawn } from "node:child_process";
import { accessSync } from "node:fs";
import { createConnection, type Socket } from "node:net";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fdir } from "fdir";
import { RPC_PORT } from "./constants";
import type { ActivityPayload } from "./discord-rpc/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BINARY_NAME = `discord-rpc-bun${process.platform === "win32" ? ".exe" : ""}`;
const discordRPCDir = resolve(__dirname, "..");
const binaryPath = new fdir()
  .withFullPaths()
  .crawl(discordRPCDir)
  .sync()
  .filter((file) => file.endsWith(BINARY_NAME))?.[0];

console.log(`binaryPath: ${binaryPath}`);

const getBunBinPath = () => {
  return join(
    homedir(),
    ".bun",
    "bin",
    `bun${process.platform === "win32" ? ".exe" : ""}`,
  );
};

export type { ActivityPayload } from "./discord-rpc/types";

export class DiscordRPC {
  private socket: Socket | null = null;
  private isRPCReady = false;
  private socketReconnectAttempts = 0;
  private readonly MAX_SOCKET_RECONNECTS = 5;
  clientId: string | null = null;

  private async connect() {
    let hasBinary = false;
    try {
      // if dist file, check if binary exist
      if (__filename.endsWith("dist/index.js")) {
        accessSync(binaryPath);
        hasBinary = true;
      }
    } catch {}

    if (!hasBinary && process.env.BUN_INSTALL) {
      await new Promise((resolve) =>
        spawn(getBunBinPath(), ["x", "rimraf", binaryPath], {
          cwd: discordRPCDir,
          shell: true,
          stdio: "ignore",
          windowsHide: true,
        }).once("close", resolve),
      );

      await new Promise((resolve) =>
        spawn(getBunBinPath(), ["run", "build:bin"], {
          cwd: discordRPCDir,
          shell: true,
          stdio: "ignore",
          windowsHide: true,
        }).once("close", resolve),
      );
    }

    if (!this.isRPCReady) {
      const child = spawn(binaryPath, {
        stdio: [null, "pipe", "pipe"],
        windowsHide: true,
      });

      child.stdout.on("data", this.onData.bind(this));
      child.once("close", () => {
        this.isRPCReady = false;
      });

      return new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (this.isRPCReady) {
            clearInterval(interval);
            this.connectSocket();
            resolve();
          }
        }, 100);
      });
    }
  }

  private onData(data: Buffer) {
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(data.toString().trim());
    } catch {
      return;
    }

    switch (json.action) {
      case "ready":
        this.isRPCReady = true;
        break;
      case "error":
        console.error("[Discord RPC] Error:", json.error);
        break;
      case "warn":
        console.warn("[Discord RPC] Warning:", json.message);
        break;
      case "info":
        console.log("[Discord RPC] Info:", json.message);
        break;
      case "close":
        this.isRPCReady = false;
        break;
      case "destroyed":
        console.error(`[Discord RPC] Destroyed client ${json.clientId}`);
        break;
    }
  }

  private async connectSocket() {
    // Clean up existing socket if any
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
    }

    this.socket = createConnection({ port: RPC_PORT });

    this.socket.on("connect", () => {
      console.log("Connected to Discord RPC");
      this.socketReconnectAttempts = 0; // Reset on successful connection
    });
    this.socket.on("data", (data) => console.log(data.toString()));
    this.socket.on("close", () => {
      if (this.socketReconnectAttempts < this.MAX_SOCKET_RECONNECTS) {
        this.socketReconnectAttempts++;
        setTimeout(() => {
          if (this.socket && !this.socket.destroyed) {
            this.socket.connect({ port: RPC_PORT });
          }
        }, 1000);
      } else {
        console.warn("[Discord RPC] Max socket reconnect attempts reached");
      }
    });
    this.socket.on("error", (err) => {
      // Prevent uncaught exception, error is already logged via close event
      console.error("[Discord RPC] Socket error:", err.message);
    });
  }

  updateActivity(): Promise<void>;
  updateActivity(clearActivity: true): Promise<void>;
  updateActivity(clientId: null, disconnectClient: true): Promise<void>;
  updateActivity(clientId: string, clearActivity: true): Promise<void>;
  updateActivity(
    clientId: string,
    clearActivity: true,
    disconnectClient: true,
  ): Promise<void>;
  updateActivity(clientId: string, payload: ActivityPayload): Promise<void>;
  async updateActivity(
    clientIdOrClearActivity?: string | true | null,
    payloadOrClearOrDisconnectActivity?: ActivityPayload | true,
    disconnectClient?: true,
  ) {
    if (!this.isRPCReady) await this.connect();
    const isClearAction =
      (typeof clientIdOrClearActivity === "boolean" &&
        clientIdOrClearActivity === true) ||
      (typeof payloadOrClearOrDisconnectActivity === "boolean" &&
        payloadOrClearOrDisconnectActivity === true);
    const isUpdateAction =
      typeof clientIdOrClearActivity === "string" &&
      typeof payloadOrClearOrDisconnectActivity === "object";
    const isDisconnectAction =
      (isClearAction &&
        typeof disconnectClient === "boolean" &&
        disconnectClient === true) ||
      (clientIdOrClearActivity === null &&
        typeof payloadOrClearOrDisconnectActivity === "boolean" &&
        payloadOrClearOrDisconnectActivity === true);
    const isReconnect =
      !isClearAction && !isUpdateAction && !isDisconnectAction;
    const action = isClearAction
      ? "clear"
      : isUpdateAction
        ? "update"
        : isDisconnectAction
          ? "disconnect"
          : isReconnect
            ? "reconnect"
            : "unknown";
    const clientId =
      typeof clientIdOrClearActivity === "string"
        ? clientIdOrClearActivity
        : undefined;
    const payload =
      typeof payloadOrClearOrDisconnectActivity === "object"
        ? payloadOrClearOrDisconnectActivity
        : undefined;
    if (clientId) this.clientId = clientId;

    this.socket?.write(
      JSON.stringify({
        action,
        ...(this.clientId ? { clientId: this.clientId } : {}),
        ...(payload ? { payload } : {}),
      }),
    );
  }
}
