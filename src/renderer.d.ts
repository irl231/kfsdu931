/// <reference types="@rsbuild/core/types" />

/**
 * Imports the SVG file as a React component.
 * @requires [@rsbuild/plugin-svgr](https://npmjs.com/package/@rsbuild/plugin-svgr)
 */
declare module "*.svg?react" {
  import type React from "react";
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}

type AppPlatForm = "macos" | "windows" | "linux";

type StoreName = "app-settings" | "discord-activity";

interface AudioState {
  webContentsId: number;
  isAudible: boolean;
  isMuted: boolean;
}

interface RichPresencePayload {
  id?: string;
  url?: string;
  details?: string;
  state?: string;
  startTimestamp?: number;
  largeImageKey?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageText?: string;
  partyId?: string;
  partySize?: number;
  partyMax?: number;
  joinSecret?: string;
  spectateSecret?: string;
  // doesn't exist on loader swf
  buttons?: {
    label: string;
    url: string;
  }[];
}

interface ElectronAPI {
  getPlatform: () => AppPlatForm;
  getAppVersion: () => Promise<string>;
  getAppName: () => Promise<string>;
  splashReady: () => void;
  onSplashState: (
    cb: (message: string, isLoading?: boolean, progress?: number) => void,
  ) => VoidFunction;
  getStore: <T>(name: StoreName) => Promise<T | undefined>;
  setStore: <T>(name: StoreName, value: T) => Promise<void>;
  clearStore: (name: StoreName) => Promise<void>;
  minimizeWindow: () => void;
  toggleMaximizeWindow: () => void;
  closeWindow: () => void;
  isMaximized: () => Promise<boolean>;
  isFullScreen: () => Promise<boolean>;
  onWindowMaximizeChange: (cb: (isMaximized: boolean) => void) => VoidFunction;
  onWindowFullScreenChange: (
    cb: (isFullScreen: boolean) => void,
  ) => VoidFunction;
  onWebViewSWFReady: (cb: (url: string, id: number) => void) => VoidFunction;
  onWebViewOpenExternal: (
    cb: (url: string, senderUrl: string) => void,
  ) => VoidFunction;
  onWebViewCloseExternal: (cb: (senderUrl: string) => void) => VoidFunction;
  onWebViewAudioStateChanged: (
    cb: (audioState: AudioState) => void,
  ) => VoidFunction;
  setWebViewAudioMuted: (
    webContentsId: number,
    muted: boolean,
  ) => Promise<void>;
  getWebViewAudioState: (webContentsId: number) => Promise<AudioState | null>;
  onDiscordRPCUpdate: (richPresenceOrUrl: RichPresencePayload) => void;
  onDiscordRPCDestroy: (hostname?: string) => void;
  openExternal: (url: string) => Promise<void>;
}

interface Window {
  electron: ElectronAPI;
}

declare global {
  const window: Window;
}
