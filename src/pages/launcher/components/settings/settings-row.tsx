import type { ReactNode } from "react";

interface SettingsRowProps {
  label: string;
  description?: string;
  action: ReactNode;
}

export function SettingsRow({ label, description, action }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex-1 pr-4">
        <div className="text-app-text-secondary font-bold text-xs">{label}</div>
        {description && (
          <div className="text-app-text-primary/40 text-xs mt-1 leading-relaxed">
            {description}
          </div>
        )}
      </div>
      <div>{action}</div>
    </div>
  );
}
