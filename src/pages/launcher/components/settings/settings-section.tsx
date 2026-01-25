import type { ReactNode } from "react";

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="mb-8">
      <h3 className="text-white font-bold text-md mb-4 flex items-center gap-2">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
