"use client";
import { cn } from "@/lib/utils";

export function Chip({
  active, onClick, children, className, color, ...rest
}: { active?: boolean; onClick?: () => void; children: React.ReactNode; className?: string; color?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color">) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        active ? "border-forest/50 bg-sage-soft text-forest" : "border-line bg-paper text-charcoal hover:border-forest/40",
        className,
      )}
      style={active && color ? { background: color, borderColor: color } : undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
