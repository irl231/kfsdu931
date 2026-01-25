import { useMemo } from "react";
import { TabCloseBtn } from "./tab-close-btn";
import { TabPanel } from "./tab-panel";

export const TabItem = ({
  tab,
  isActive,
  onClick,
  onClose,
}: {
  tab: { id: string; title: string; accent: string };
  isActive: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
}) => {
  // Memoize platform check
  const platform = useMemo(() => window.electron.getPlatform(), []);
  const isMac = useMemo(
    () => !["linux", "windows"].includes(platform),
    [platform],
  );
  return (
    <div
      role="tab"
      tabIndex={isActive ? 0 : -1}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-selected={isActive}
      aria-label={`${tab.title}${isActive ? " (current tab)" : ""}`}
      aria-controls={`tabpanel-${tab.id}`}
      id={`tab-${tab.id}`}
      className={`${isMac ? "h-[32px]" : "h-[26px]"} relative group w-full select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-app-accent focus-visible:outline-offset-2 focus-visible:rounded transition-colors`}
    >
      <TabPanel isActive={isActive} />
      <div className="relative z-50 h-full flex items-center justify-between gap-2 pl-3 pr-2 py-1.5 transition-colors">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: tab.accent }}
          />
          <span className="text-xs truncate">{tab.title}</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <TabCloseBtn accent={tab.accent} onClick={onClose} />
        </div>
      </div>
    </div>
  );
};
