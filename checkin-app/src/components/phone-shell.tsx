"use client";

import type { ReactNode } from "react";

export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-[#dbe7f5] px-3 py-4 sm:py-8">
      <div className="flex w-full max-w-[430px] flex-col">
        <div className="flex min-h-[min(100dvh,860px)] flex-1 flex-col overflow-hidden rounded-[28px] bg-[#F8FAFC] shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  disabled,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 text-base font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.35)] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
    >
      {children}
    </button>
  );
}
