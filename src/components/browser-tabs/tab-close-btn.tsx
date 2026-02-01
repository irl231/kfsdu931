import { IconX } from "@tabler/icons-react";

export const TabCloseBtn = ({
  accent,
  onClick,
}: {
  accent: string;
  onClick: (e: React.MouseEvent | React.KeyboardEvent) => void;
}) => {
  1;
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
      className={`p-0.5 rounded-full transition-all outline-none bg-transparent hover:bg-[${accent}] color-[${accent}] hover:color-app-tertiary cursor-pointer`}
    >
      <IconX size={12} />
    </div>
  );
};
