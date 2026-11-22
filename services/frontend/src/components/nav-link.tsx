"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NavLinkProps = { href: string; icon: ReactNode; label: string; count?: number };

/**
 * One sidebar link that knows the current page and highlights itself: "/" only on the overview
 * itself, any other section also on its sub-pages (a plot page is under Plots).
 * It reads the address, so it must render inside <Suspense>.
 */
export function NavLink(props: NavLinkProps) {
  const pathname = usePathname();
  const active = props.href === "/" ? pathname === "/" : pathname === props.href || pathname.startsWith(`${props.href}/`);
  return <NavLinkView {...props} active={active} />;
}

/** How a sidebar link looks. Without `active` it is the plain version, used while the sidebar loads. */
export function NavLinkView({ href, icon, label, count, active = false }: NavLinkProps & { active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "pressable flex items-center gap-2.5 rounded-lg px-2.5 py-1.5",
        active ? "bg-card font-medium shadow-sm ring-1 ring-border" : "text-foreground/80 hover:bg-muted hover:text-foreground",
      )}
    >
      <span className={cn("[&_svg]:size-4", active ? "text-brand" : "text-muted-foreground")}>{icon}</span>
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-muted-foreground">{count}</span>}
    </Link>
  );
}
