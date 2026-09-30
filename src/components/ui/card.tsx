import React from 'react';
import { cn } from "../../lib/utils";

export const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("bg-white p-6 rounded-xl border border-slate-200 shadow-sm", className)}>{children}</div>
);

export const CardHeader = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("mb-4", className)}>{children}</div>
);

export const CardTitle = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <h3 className={cn("text-lg font-semibold text-slate-700", className)}>{children}</h3>
);

export const CardContent = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("", className)}>{children}</div>
);
