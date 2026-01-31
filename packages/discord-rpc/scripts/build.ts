import { execSync } from "node:child_process";

const targets = ["darwin-arm64", "darwin-x64", "windows-x64"];

targets.forEach((target) => {
  if (target.startsWith(process.platform)) {
    execSync(
      `bun run build:bin --target=bun-${target} --outfile dist/discord-rpc-bun-${target.split("-")[1]}`,
      { stdio: "inherit" },
    );
  }
});
