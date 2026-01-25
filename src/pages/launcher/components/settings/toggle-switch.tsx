import { motion } from "motion/react";
import { memo, useCallback } from "react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}

function ToggleSwitchComponent({
  checked,
  onChange,
  label,
}: ToggleSwitchProps) {
  const handleChange = useCallback(() => {
    onChange(!checked);
  }, [checked, onChange]);

  return (
    <button
      type="button"
      onClick={handleChange}
      role="switch"
      aria-checked={checked}
      aria-label={label ? `Toggle ${label}` : "Toggle option"}
      className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 relative flex items-center focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-app-accent outline-none ${
        checked ? "bg-app-accent" : "bg-white/10"
      }`}
    >
      <motion.div
        initial={false}
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`w-4 h-4 rounded-full shadow-sm ${
          checked ? "bg-black" : "bg-white/60"
        }`}
      />
    </button>
  );
}

export const ToggleSwitch = memo(ToggleSwitchComponent);
