"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  List,
  CaretDown,
  Info,
  FileCode,
  GearSix,
  Palette,
  FolderSimple,
  Trash,
  Terminal,
  ImageSquare,
} from "@phosphor-icons/react";
import { SessionDrawer } from "@/app/components/session-drawer";
import { type ComponentType } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface PageEntry {
  label: string;
  href: string;
  icon: ComponentType<{ size?: number; weight?: string; className?: string }>;
}

const PAGES: PageEntry[] = [
  { label: "About", href: "/dashboard", icon: Info },
  { label: "Uploads", href: "/dashboard/uploads", icon: ImageSquare },
  { label: "Claude Config", href: "/dashboard/files", icon: FileCode },
  { label: "Settings", href: "/dashboard/settings", icon: GearSix },
  { label: "Appearance", href: "/dashboard/appearance", icon: Palette },
  { label: "Projects", href: "/dashboard/projects", icon: FolderSimple },
  { label: "Prompt", href: "/dashboard/prompt", icon: Terminal },
  { label: "Trash", href: "/dashboard/trash", icon: Trash },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const hasUnseen = useQuery(api.sessions.hasUnseen);

  const current = PAGES.find((p) => p.href === pathname) ?? PAGES[0];

  return (
    <SessionDrawer>
      <div className="h-[100dvh] flex flex-col bg-base-100">
        {/* Navbar */}
        <div className="navbar bg-base-200 shrink-0 gap-1 pt-[calc(env(safe-area-inset-top)-16px)]">
          <div className="flex-none">
            <label
              htmlFor="session-drawer"
              className="btn btn-ghost btn-sm btn-square indicator"
            >
              {hasUnseen && (
                <span className="indicator-item badge badge-xs badge-primary" />
              )}
              <List size={18} weight="bold" />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <div className="dropdown">
              <div
                tabIndex={0}
                role="button"
                className="btn btn-ghost btn-sm gap-1 active:bg-base-300"
              >
                <current.icon size={16} weight="duotone" />
                <span className="font-semibold text-sm">{current.label}</span>
                <CaretDown size={12} weight="bold" className="opacity-60" />
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu bg-base-300 rounded-box z-10 w-48 p-1 shadow-lg"
              >
                {PAGES.map((page) => (
                  <li key={page.href}>
                    <a
                      onClick={() => {
                        router.push(page.href);
                        (document.activeElement as HTMLElement)?.blur();
                      }}
                      className={page.href === current.href ? "active" : ""}
                    >
                      <page.icon size={16} weight="duotone" />
                      {page.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Page content */}
        {children}
      </div>
    </SessionDrawer>
  );
}
