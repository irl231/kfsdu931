import { memo } from "react";

interface SettingsMenuItemProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function SettingsMenuItemComponent({
  label,
  active,
  onClick,
}: SettingsMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label}${active ? " (selected)" : ""}`}
      className={`
				w-full flex items-center border gap-3 px-4 py-2.5 rounded-lg transition-all cursor-pointer relative group select-none
				${active ? "border-app-accent" : "border-transparent text-app-text-primary hover:text-app-text-primary hover:bg-white/10"}
			`}
    >
      <span
        className={`text-xs font-bold tracking-wide ${active ? "text-app-accent" : ""}`}
      >
        {label}
      </span>
    </button>
  );
}

export const SettingsMenuItem = memo(SettingsMenuItemComponent);
