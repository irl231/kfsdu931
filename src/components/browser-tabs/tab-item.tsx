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
  onClose: (e: any) => void;
}) => {
  const platform = window.electron.getPlatform();
  const isMac = !["linux", "windows"].includes(platform);
  return (
    // biome-ignore lint/a11y/useSemanticElements: "div with role=button"
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`${isMac ? "h-[32px]" : "h-[26px]"} relative group w-full select-none cursor-pointer`}
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
