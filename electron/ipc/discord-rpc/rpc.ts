import fs from "node:fs";
import path from "node:path";
import { Client, type SetActivity } from "@xhayper/discord-rpc";
import type { PathData } from "@xhayper/discord-rpc/dist/transport/IPC";

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
  client?: Client;
  lastPresence?: SetActivity;
  ready = false;

  private formatActivity(richPresence: SetActivity) {
    return {
      details: richPresence.details,
      state: richPresence.state,
      startTimestamp: richPresence.startTimestamp,
      endTimestamp: richPresence.endTimestamp,
      largeImageKey: richPresence.largeImageKey,
      largeImageText: richPresence.largeImageText,
      smallImageKey: richPresence.smallImageKey,
      smallImageText: richPresence.smallImageText,
      partyId: richPresence.partyId,
      partySize: richPresence.partySize,
      partyMax: richPresence.partyMax,
      joinSecret: richPresence.joinSecret,
      spectateSecret: richPresence.spectateSecret,
      matchSecret: richPresence.matchSecret,
      buttons: richPresence.buttons,
      instance: false,
    };
  }

  async init(richPresence: SetActivity): Promise<void> {
    this.lastPresence = richPresence;

    if (this.client) {
      await this.destroy();
    }

    this.client = new Client({
      clientId: richPresence.applicationId!,
      transport: { type: "ipc", pathList },
    });

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 10000);

      this.client!.on("ready", async () => {
        clearTimeout(timeout);
        this.ready = true;

        if (this.lastPresence) {
          try {
            const activity = this.formatActivity(this.lastPresence);
            await this.client!.user!.setActivity(activity);
          } catch (error) {
            reject(error);
            return;
          }
        }
        resolve();
      });

      this.client!.on("disconnected", () => {
        clearTimeout(timeout);
        this.ready = false;
      });

      this.client!.login()
        .then(() => {})
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  async update(richPresence: SetActivity) {
    this.lastPresence = richPresence;

    if (!this.ready || !this.client?.user) {
      return;
    }

    const activity = this.formatActivity(richPresence);
    await this.client.user.setActivity(activity);
  }

  async destroy() {
    if (!this.client) {
      return;
    }

    if (this.client.user) {
      await this.client.user.clearActivity();
    }
    await this.client.destroy();

    this.client = undefined;
    this.ready = false;
    this.lastPresence = undefined;
  }
}
