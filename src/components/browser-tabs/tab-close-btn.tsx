import { IconX } from "@tabler/icons-react";

export const TabCloseBtn = ({
  accent,
  onClick,
}: {
  accent: string;
  onClick: (e: any) => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className={`p-0.5 rounded-full transition-all outline-none bg-transparent hover:bg-[${accent}] color-[${accent}] hover:color-app-tertiary `}
    >
      <IconX size={12} />
    </button>
  );
};
