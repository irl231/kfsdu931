import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { app, net } from "electron";
import log from "electron-log";
import { ASSET_PATH, sleep } from "../utils";

const REPO_OWNER = "irl231";
const REPO_NAME = "kfsdu931";
const GITHUB_API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  name: string;
  assets: GitHubAsset[];
  prerelease: boolean;
}

const getPlatformArch = () => {
  const os =
    process.platform === "win32"
      ? "win"
      : process.platform === "darwin"
        ? "mac"
        : "linux";
  const arch = process.arch === "arm64" ? "x64" : process.arch;
  return { os, arch };
};

const fetchJson = async (
  url: string,
  retries = 3,
  sleepSeconds = 1,
): Promise<any> => {
  try {
    return await new Promise((resolve, reject) => {
      const request = net.request(url);
      request.setHeader("User-Agent", "Electron-Launcher");
      request.on("response", (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch ${url}: ${response.statusCode}`));
          return;
        }
        let data = "";
        response.on("data", (chunk) => {
          data += chunk.toString();
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
        response.on("error", (err: unknown) => {
          reject(err);
        });
      });
      request.on("error", (err) => {
        reject(err);
      });
      request.end();
    });
  } catch (error) {
    if (!(error as any).message.endsWith(": 404")) {
      if (retries > 0) {
        log.warn(
          `Failed to fetch ${url}, retrying... (${retries} attempts left)`,
        );
        await sleep(sleepSeconds * 1000 + 1000);
        return fetchJson(url, retries - 1, sleepSeconds + 1);
      }
    }
    throw error;
  }
};

const getLatestRelease = async (): Promise<GitHubRelease | null> => {
  try {
    const release: GitHubRelease = await fetchJson(
      `${GITHUB_API_BASE}/releases/latest`,
    );
    return release;
  } catch (error) {
    log.error("failed to fetch latest release:", error);
    return null;
  }
};

const getNightlyRelease = async (): Promise<GitHubRelease | null> => {
  try {
    const releases: GitHubRelease[] = await fetchJson(
      `${GITHUB_API_BASE}/releases`,
    );
    const nightlyRelease = releases.find((r) => r.name.includes("nightly"));
    return nightlyRelease || null;
  } catch (error) {
    log.error("failed to fetch releases:", error);
    return null;
  }
};

export const checkForUpdate = async (): Promise<{
  updateAvailable: boolean;
  url?: string;
  version?: string;
}> => {
  if (!app.isPackaged) {
    log.debug("skipping update check in dev mode");
    return { updateAvailable: false };
  }

  const { os, arch } = getPlatformArch();
  log.debug(`checking for updates...`);

  try {
    const packageJsonPath = path.join(app.getAppPath(), "package.json");
    const localPackageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf-8"),
    );
    const localVersion = localPackageJson.version;

    if (localVersion.includes("nightly")) {
      const nightlyRelease = await getNightlyRelease();
      if (nightlyRelease) {
        const remoteVersion = nightlyRelease.name.replace(/^v/, "");
        log.debug(
          `latest nightly version: ${remoteVersion}, local version: ${localVersion}`,
        );
        if (remoteVersion !== localVersion) {
          const asset = nightlyRelease.assets.find((a) =>
            a.name.endsWith(`${os}-${arch}-resources.zip`),
          );
          if (asset) {
            log.debug(`found nightly update: ${remoteVersion}`);
            return {
              updateAvailable: true,
              url: asset.browser_download_url,
              version: remoteVersion,
            };
          }
        }
      }
    } else {
      const latestRelease = await getLatestRelease();
      if (latestRelease) {
        const remoteVersion = latestRelease.name.replace(/^v/, "");
        log.debug(
          `latest stable version: ${remoteVersion}, local version: ${localVersion}`,
        );
        if (remoteVersion !== localVersion) {
          const asset = latestRelease.assets.find((a) =>
            a.name.endsWith(`${os}-${arch}-resources.zip`),
          );
          if (asset) {
            log.debug(`found stable update: ${remoteVersion}`);
            return {
              updateAvailable: true,
              url: asset.browser_download_url,
              version: remoteVersion,
            };
          }
        }
      }
    }

    return { updateAvailable: false };
  } catch (error) {
    log.error("error checking for update:", error);
    return { updateAvailable: false };
  }
};

export const downloadUpdate = async (
  url: string,
  onProgress: (progress: number) => void,
): Promise<string> => {
  const tempPath = fs.mkdtempSync(path.join(app.getPath("temp"), "update-"));
  const filePath = path.join(tempPath, "update.zip");

  log.debug(`downloading update from ${url} to ${filePath}`);

  return new Promise((resolve, reject) => {
    const request = net.request(url);

    request.on("redirect", (_statusCode, _method, redirectUrl) => {
      log.debug(`redirecting to ${redirectUrl}`);
      request.followRedirect();
    });

    request.on("response", (response) => {
      if (response.statusCode >= 400) {
        reject(new Error(`failed to download update: ${response.statusCode}`));
        return;
      }

      const totalBytes = parseInt(
        response.headers["content-length"] as string,
        10,
      );
      let receivedBytes = 0;
      let lastProgress = -1;
      const fileStream = fs.createWriteStream(filePath);

      response.on("data", (chunk) => {
        receivedBytes += chunk.length;
        fileStream.write(chunk);
        if (totalBytes > 0) {
          const currentProgress = Math.floor(
            (receivedBytes / totalBytes) * 100,
          );
          if (currentProgress > lastProgress) {
            lastProgress = currentProgress;
            onProgress(currentProgress);
          }
        }
      });

      response.on("end", () => {
        fileStream.end();
        if (lastProgress < 100) reject(new Error("download failed"));
        else resolve(filePath);
      });

      response.on("error", (err: unknown) => {
        fs.unlink(tempPath, () => {});
        reject(err);
      });
    });

    request.on("error", (err) => {
      reject(err);
    });

    request.end();
  });
};

export const relaunchApp = () => {
  log.debug("relaunching app...");
  app.relaunch();
  app.exit(0);
};

export const applyUpdate = async (zipPath: string) => {
  log.debug("applying update...");

  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(path.join(ASSET_PATH, "..", ".."), true);
    log.debug("update extracted successfully.");
    relaunchApp();
  } catch (error) {
    log.error("failed to apply update:", error);
    throw error;
  }
};

export async function initUpdate(
  setState: (text: string, isLoading?: boolean, progress?: number) => void,
) {
  await sleep(1000);

  try {
    setState("checking for updates");
    const result = await checkForUpdate().catch(async () => {
      setState("update check failed", false);
      await sleep(1000);
      return { updateAvailable: false, url: undefined, version: undefined };
    });

    if (result.updateAvailable && result.url) {
      setState("new version found", false);
      await sleep(1500);

      try {
        const zipPath = await downloadUpdate(result.url, (currentProgress) => {
          setState("downloading update", true, currentProgress);
        });
        await sleep(800);
        setState("installing update");
        await sleep(1000);
        await applyUpdate(zipPath);
      } catch (e) {
        log.error("update failed", e);
        setState("update failed", false);
      }
    }
  } catch (error) {
    log.error("failed to check update", error);
    setState("update check failed");
  }
  await sleep(1000);
}
