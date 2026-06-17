// src/components/shared/ErrorState.tsx
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Terjadi kesalahan. Coba lagi.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <AlertTriangle className="w-12 h-12 text-brand-error" />
      <p className="text-body text-neutral-mid text-center">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Coba Lagi
        </Button>
      )}
    </div>
  );
}
