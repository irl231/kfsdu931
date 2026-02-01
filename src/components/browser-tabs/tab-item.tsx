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
  index: number;
  isActive: boolean;
  onClick: () => void;
  onClose: (e: React.MouseEvent | React.KeyboardEvent) => void;
  onToggleMute?: (e: React.MouseEvent | React.KeyboardEvent) => void;
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
    <button
      type="button"
      tabIndex={0}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`${tab.title}${isActive ? " (current tab)" : ""}${isMuted ? " (muted)" : isAudible ? " (playing audio)" : ""}`}
      className={`${isMac ? "h-[32px]" : "h-[26px]"} relative group w-full outline-none`}
    >
      <TabPanel
        isActive={isActive}
        className="group-focus-visible:bg-[#292c2f] group-focus-visible:z-30"
        fill="group-focus-visible:fill-[#292c2f]"
      />
      <div className="relative z-50 h-full flex items-center justify-between gap-2 pl-3 pr-2 py-1.5 transition-colors">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {showAudioToggle && onToggleMute ? (
              <AudioToggle
                className="border border-transparent rounded-md hover:bg-white/5 hover:border-white/15 transition-colors duration-200"
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
    </button>
  );
};
