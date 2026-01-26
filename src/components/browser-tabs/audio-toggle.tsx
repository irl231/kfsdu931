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
      className="p-0 rounded-full transition-all outline-none bg-transparent flex items-center justify-center"
      style={{ color: accent }}
    >
      {isMuted ? (
        <IconVolumeOff size={12} strokeWidth={2.5} />
      ) : (
        <IconVolume size={12} strokeWidth={2.5} />
      )}
    </button>
  );
};
