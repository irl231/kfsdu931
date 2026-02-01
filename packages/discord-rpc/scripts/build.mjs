import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const targets = ["darwin-arm64", "darwin-x64", "windows-x64"];

const platform = process.platform === "win32" ? "windows" : process.platform;
for (const target of targets) {
  if (target.startsWith(platform)) {
    spawnSync(
      `bun run build:bin --target=bun-${target} --outfile dist/discord-rpc-bun${platform === "darwin" ? `-${target.split("-")[1]}` : ""}`,
      {
        cwd: resolve(__dirname, ".."),
        stdio: "inherit",
        env: process.env,
        shell: true,
      },
    );
  }
}
