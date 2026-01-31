import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const targets = ["darwin-arm64", "darwin-x64", "windows-x64"];

const processes = targets
  .map((target) => {
    if (target.startsWith(process.platform)) {
      return spawn(
        `bun run build:bin --target=bun-${target} --outfile dist/discord-rpc-bun${process.platform === "darwin" ? `-${target.split("-")[1]}` : ""}`,
        {
          cwd: resolve(__dirname, ".."),
          stdio: "inherit",
          env: process.env,
          shell: true,
        },
      );
    }

    return null;
  })
  .filter(Boolean);

Promise.all(processes)
  .then(() => {
    console.log("Build completed");
  })
  .catch((err) => {
    console.error("Build failed", err);
  });
