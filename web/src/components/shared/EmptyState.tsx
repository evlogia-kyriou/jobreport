// src/components/shared/EmptyState.tsx
import { ClipboardList, LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  icon: Icon = ClipboardList,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <Icon className="w-12 h-12 text-neutral-border" />
      <div className="text-center">
        <p className="font-medium text-neutral-dark">{title}</p>
        <p className="text-small text-neutral-mid">{description}</p>
      </div>
      {action}
    </div>
  );
}
