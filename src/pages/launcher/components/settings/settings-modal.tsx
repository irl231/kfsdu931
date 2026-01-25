import { IconX } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { SettingsMenuItem } from "./settings-menu-item";
import { SettingsRow } from "./settings-row";
import { SettingsSection } from "./settings-section";
import { ToggleSwitch } from "./toggle-switch";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState("general");
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [discordPresence, setDiscordPresence] = useState(true);
  const [appVersion, setAppVersion] = useState("");
  const [appName, setAppName] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    window.electron
      .getStore<{
        appSettings?: {
          closeWindowOption?: string;
          discordPresence?: boolean;
        };
      }>("app-settings")
      .then((store) => {
        const settings = store?.appSettings;
        if (settings) {
          setMinimizeToTray(settings.closeWindowOption === "hide");
          setDiscordPresence(settings.discordPresence ?? true);
        }
      });
  }, [isOpen]);

  useEffect(() => {
    // Fetch app info only once on mount, not when modal opens/closes
    let mounted = true;
    Promise.all([
      window.electron.getAppVersion(),
      window.electron.getAppName(),
    ]).then(([version, name]) => {
      if (mounted) {
        setAppVersion(version);
        setAppName(name);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const toggleMinimizeToTray = useCallback(async (val: boolean) => {
    setMinimizeToTray(val);
    const store = await window.electron.getStore<{
      appSettings?: Record<string, unknown>;
    }>("app-settings");
    if (store?.appSettings) {
      await window.electron.setStore("app-settings", {
        appSettings: {
          ...store.appSettings,
          closeWindowOption: val ? "hide" : "exit",
        },
      });
    }
  }, []);

  const toggleDiscordPresence = useCallback(async (val: boolean) => {
    setDiscordPresence(val);
    const store = await window.electron.getStore<{
      appSettings?: Record<string, unknown>;
    }>("app-settings");
    if (store?.appSettings) {
      if (!val) window.electron.onDiscordRPCDestroy();
      await window.electron.setStore("app-settings", {
        appSettings: {
          ...store.appSettings,
          discordPresence: val,
        },
      });
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-[80%] h-[85%] max-w-[720px] max-h-[550px] bg-[#1E1E1E] rounded-2xl shadow-2xl flex overflow-hidden border border-white/10 z-10 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-[200px] bg-app-primary flex flex-col p-6 border-r border-white/5 relative">
          <div className="mb-8 pl-2 pt-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-3 tracking-tight">
              Settings
            </h2>
          </div>

          <div className="space-y-2 flex-1">
            <SettingsMenuItem
              label="General"
              active={activeTab === "general"}
              onClick={() => setActiveTab("general")}
            />
          </div>

          <div className="text-[10px] text-app-text-primary/20 font-mono text-center border-t border-white/5 pt-4">
            {appName} - v{appVersion}
          </div>
        </div>

        <div className="flex-1 flex flex-col relative bg-app-secondary">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 z-20 outline-none ring-0 bg-transparent text-app-text-primary/40 hover:text-app-text-primary transition-colors"
          >
            <IconX size={18} />
          </button>

          <div className="flex-1 pl-6 pr-10 py-8 overflow-y-auto scrollbar-thin">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "general" && (
                  <SettingsSection title="Preferences">
                    <SettingsRow
                      label="Discord Presence"
                      description="Display your active game status on Discord."
                      action={
                        <ToggleSwitch
                          checked={discordPresence}
                          onChange={toggleDiscordPresence}
                        />
                      }
                    />
                    <SettingsRow
                      label="Minimize to System Tray"
                      description="Keep the launcher running in the background when you close the window."
                      action={
                        <ToggleSwitch
                          checked={minimizeToTray}
                          onChange={toggleMinimizeToTray}
                        />
                      }
                    />
                  </SettingsSection>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
