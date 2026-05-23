"use client";

import { useCallback, useState } from "react";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PendingConfirm = ConfirmOptions & {
  resolve: (confirmed: boolean) => void;
};

export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const handleCancel = useCallback(() => {
    pending?.resolve(false);
    setPending(null);
    setLoading(false);
  }, [pending]);

  const handleConfirm = useCallback(async () => {
    if (!pending) return;
    setLoading(true);
    pending.resolve(true);
    setPending(null);
    setLoading(false);
  }, [pending]);

  return {
    confirm,
    dialogProps: pending
      ? {
          open: true as const,
          title: pending.title,
          description: pending.description,
          confirmLabel: pending.confirmLabel,
          cancelLabel: pending.cancelLabel,
          destructive: pending.destructive,
          loading,
          onConfirm: handleConfirm,
          onCancel: handleCancel,
        }
      : {
          open: false as const,
          title: "",
          description: "",
          loading: false,
          onConfirm: handleConfirm,
          onCancel: handleCancel,
        },
  };
}
