"use client";

import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * The phone's menu: a button that opens the sidebar's sections in a drawer from the left.
 * Tapping a link closes it. `children` is the same navigation the sidebar shows.
 */
export function MobileNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open menu" className="-ml-1.5" />}>
        <Menu />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-72 gap-0 bg-background p-3 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <SheetTitle className="px-2.5 pt-1 pb-3">AgroPilot</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
