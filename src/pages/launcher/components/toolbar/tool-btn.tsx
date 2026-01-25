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
    "bg-black/40 border-white/10 text-app-text-primary/70 hover:text-app-text-primary hover:bg-white/10";

  return (
    <button
      type="button"
      className={`w-12 h-12 rounded-full border backdrop-blur-md flex items-center justify-center transition-all group relative outline-none ring-0 focus-visible:ring-2 focus-visible:ring-app-accent ${baseClass}`}
      onClick={handleClick}
      aria-label={ariaLabel || tooltip}
      title={tooltip}
    >
      {icon}
      {tooltip && (
        <span className="absolute -top-10 bg-black/80 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none z-50">
          {tooltip}
        </span>
      )}
    </button>
  );
}

export const ToolBtn = memo(ToolBtnComponent);
