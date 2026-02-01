import { IconVolume, IconVolumeOff } from "@tabler/icons-react";

export const AudioToggle = ({
  accent,
  isMuted,
  onClick,
  className = "",
}: {
  accent: string;
  isMuted: boolean;
  onClick: (e: React.MouseEvent | React.KeyboardEvent) => void;
  className?: string;
}) => {
  return (
    <div
      role="button"
      tabIndex={-1}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e);
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={isMuted ? "Unmute tab" : "Mute tab"}
      aria-pressed={isMuted}
      className={`p-2 outline-none bg-transparent flex items-center justify-center cursor-pointer ${className}`}
      style={{ color: accent }}
    >
      {isMuted ? (
        <IconVolumeOff size={12} strokeWidth={2.5} className="flex-shrink-0" />
      ) : (
        <IconVolume size={12} strokeWidth={2.5} className="flex-shrink-0" />
      )}
    </div>
  );
};
