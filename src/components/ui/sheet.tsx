"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sheet({ open, onOpenChange, title, children, side = "bottom" }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: React.ReactNode; side?: "bottom" | "right" }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-charcoal/30 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex flex-col bg-ivory shadow-2xl outline-none",
            side === "bottom" ? "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl" : "inset-y-0 right-0 w-full max-w-md",
          )}
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <Dialog.Title className="font-display text-lg">{title}</Dialog.Title>
            <Dialog.Close className="rounded-full p-2 hover:bg-ivory-deep" aria-label="Close">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
