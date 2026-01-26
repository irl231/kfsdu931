import { IconVolume, IconVolumeOff } from "@tabler/icons-react";

export const AudioToggle = ({
  accent,
  isMuted,
  onClick,
}: {
  accent: string;
  isMuted: boolean;
  onClick: (e: React.MouseEvent) => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={isMuted ? "Unmute tab" : "Mute tab"}
      aria-pressed={isMuted}
      className="w-2 h-2 p-0 rounded-full outline-none bg-transparent flex items-center justify-center"
      style={{ color: accent }}
    >
      {isMuted ? (
        <IconVolumeOff size={8} strokeWidth={2.5} className="flex-shrink-0" />
      ) : (
        <IconVolume size={8} strokeWidth={2.5} className="flex-shrink-0" />
      )}
    </button>
  );
};
