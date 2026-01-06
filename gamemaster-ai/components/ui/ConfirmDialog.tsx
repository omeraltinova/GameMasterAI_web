"use client";

import { Button } from "./Button";
import { Modal } from "./Modal";
import { AlertTriangle, Info, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

const variantConfig = {
  danger: {
    icon: AlertTriangle,
    iconClass: "text-danger",
    bgClass: "bg-danger/10",
    confirmVariant: "danger" as const,
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-warning",
    bgClass: "bg-warning/10",
    confirmVariant: "secondary" as const,
  },
  info: {
    icon: Info,
    iconClass: "text-primary",
    bgClass: "bg-primary/10",
    confirmVariant: "primary" as const,
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Onayla",
  cancelText = "İptal",
  variant = "warning",
  isLoading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()} title="">
      <div className="flex flex-col items-center text-center p-2">
        {/* Icon */}
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mb-4",
          config.bgClass
        )}>
          <Icon className={cn("h-8 w-8", config.iconClass)} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>

        {/* Description */}
        <p className="text-foreground-secondary text-sm mb-6 max-w-sm">
          {description}
        </p>

        {/* Buttons */}
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            isLoading={isLoading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

