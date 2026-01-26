import { useMemo, useState } from "react";
import { AudioToggle } from "./audio-toggle";
import { TabCloseBtn } from "./tab-close-btn";
import { TabPanel } from "./tab-panel";

export const TabItem = ({
  tab,
  isActive,
  onClick,
  onClose,
  onToggleMute,
}: {
  tab: {
    id: string;
    title: string;
    accent: string;
    isAudible?: boolean;
    isMuted?: boolean;
  };
  isActive: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent) => void;
  onToggleMute?: (e: React.MouseEvent) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Memoize platform check
  const platform = useMemo(() => window.electron.getPlatform(), []);
  const isMac = useMemo(
    () => !["linux", "windows"].includes(platform),
    [platform],
  );

  // Determine what to show in the favicon area
  // - No audio playing: always show favicon dot
  // - Audio playing + not muted: show toggle only on hover
  // - Audio muted: always show toggle
  const isAudible = tab.isAudible ?? false;
  const isMuted = tab.isMuted ?? false;
  const hasAudioActivity = isAudible || isMuted;
  const showAudioToggle = hasAudioActivity && (isMuted || isHovered);

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-selected={isActive}
      aria-label={`${tab.title}${isActive ? " (current tab)" : ""}${isMuted ? " (muted)" : isAudible ? " (playing audio)" : ""}`}
      aria-controls={`tabpanel-${tab.id}`}
      id={`tab-${tab.id}`}
      className={`${isMac ? "h-[32px]" : "h-[26px]"} relative group w-full select-none cursor-pointer outline-none transition-colors`}
    >
      <TabPanel isActive={isActive} />
      <div className="relative z-50 h-full flex items-center justify-between gap-2 pl-3 pr-2 py-1.5 transition-colors">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <div className="relative w-2 h-2 flex-shrink-0 flex items-center justify-center">
            {showAudioToggle && onToggleMute ? (
              <AudioToggle
                accent={tab.accent}
                isMuted={isMuted}
                onClick={onToggleMute}
              />
            ) : (
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tab.accent }}
              />
            )}
          </div>
          <span className="text-xs truncate">{tab.title}</span>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <TabCloseBtn accent={tab.accent} onClick={onClose} />
        </div>
      </div>
    </div>
  );
};
