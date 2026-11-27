import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap", {
  variants: {
    tone: {
      neutral: "bg-ivory-deep text-charcoal",
      forest: "bg-forest/10 text-forest",
      terracotta: "bg-terracotta/12 text-terracotta",
      ochre: "bg-ochre/15 text-[#8a6420]",
      sample: "bg-[#fff1c2] text-[#6b4e00] ring-1 ring-[#e4c35a] uppercase tracking-wide font-semibold",
      warn: "bg-[#f6e3dc] text-[#8a3f26]",
      outline: "ring-1 ring-line text-muted",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
