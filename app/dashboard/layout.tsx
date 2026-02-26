"use client";

import { useRouter, usePathname } from "next/navigation";
import {
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
import { TopBar } from "@/app/components/top-bar";
import { type Icon } from "@phosphor-icons/react";

interface PageEntry {
  label: string;
  href: string;
  icon: Icon;
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

  const current = PAGES.find((p) => p.href === pathname) ?? PAGES[0];

  return (
    <SessionDrawer>
      <div className="h-[100dvh] flex flex-col bg-base-100">
        <TopBar>
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
        </TopBar>

        {/* Page content */}
        {children}
      </div>
    </SessionDrawer>
  );
}
