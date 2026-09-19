"use client";

import React from "react";
import Image from "next/image";
import { Button } from "./button";

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  showLogo?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  showLogo = false,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl min-h-[300px]">
      {showLogo ? (
        <div className="relative w-36 h-36 mb-6 drop-shadow-2xl">
          <Image
            src="/brand/stagex-logo.png"
            alt="StageX AI"
            fill
            className="object-contain"
            priority
          />
        </div>
      ) : icon ? (
        <div className="p-4 mb-4 text-slate-400 bg-slate-800/60 rounded-2xl border border-slate-700/50">
          {icon}
        </div>
      ) : null}

      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6">{description}</p>

      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
