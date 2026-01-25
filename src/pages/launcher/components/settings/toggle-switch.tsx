import { motion } from "motion/react";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 relative flex items-center ${
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
