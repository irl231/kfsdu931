import type { ReactNode } from "react";
import { memo, useCallback } from "react";

interface ToolBtnProps {
  icon: ReactNode;
  tooltip?: string;
  ariaLabel?: string;
  href?: string;
  onClick?: () => void;
}

function ToolBtnComponent({
  icon,
  tooltip,
  ariaLabel,
  href,
  onClick,
}: ToolBtnProps) {
  const handleClick = useCallback(() => {
    onClick?.();
    if (href) window.open(href, "_blank");
  }, [onClick, href]);

  const baseClass =
    "bg-zinc-800 text-app-text-primary/70 hover:text-black hover:bg-zinc-500";

  return (
    <button
      type="button"
      className={`w-11 h-11 rounded-xl backdrop-blur-md flex items-center justify-center transition-all group relative outline-none ring-2 ring-zinc-800 focus:ring-zinc-700 ${baseClass}`}
      onClick={handleClick}
      aria-label={ariaLabel || tooltip}
      title={tooltip}
    >
      {icon}
      {tooltip && (
        <span className="absolute bg-app-primary -top-10 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none text-app-text-primary z-50">
          {tooltip}
        </span>
      )}
    </button>
  );
}

export const ToolBtn = memo(ToolBtnComponent);
