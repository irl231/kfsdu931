import { registerAppHandlers } from "./app";
import { registerDiscordRPCHandlers } from "./discord-rpc";
import { registerStoreHandlers } from "./store";
import { registerWindowHandlers } from "./window";

export function registerIpcHandlers() {
  registerAppHandlers();
  registerStoreHandlers();
  registerWindowHandlers();
  registerDiscordRPCHandlers();
}
