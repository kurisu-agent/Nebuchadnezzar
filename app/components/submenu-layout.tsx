"use client";

import { useRouter, usePathname } from "next/navigation";
import { CaretDown } from "@phosphor-icons/react";
import { SessionDrawer } from "@/app/components/session-drawer";
import { TopBar } from "@/app/components/top-bar";
import { type Icon } from "@phosphor-icons/react";
import { type ReactNode } from "react";

export interface SubMenuPage {
  label: string;
  href: string;
  icon: Icon;
}

interface SubMenuLayoutProps {
  pages: SubMenuPage[];
  children: ReactNode;
  /** Optional leading content before the dropdown (e.g. project color dot) */
  leading?: ReactNode;
  /** Optional trailing content on the right side of the top bar */
  trailing?: ReactNode;
  /** TopBar background class */
  bg?: string;
}

export function SubMenuLayout({
  pages,
  children,
  leading,
  trailing,
  bg,
}: SubMenuLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Exact match first, then longest-prefix match, then fallback to first page
  const current =
    pages.find((p) => p.href === pathname) ??
    pages
      .filter((p) => pathname.startsWith(p.href + "/"))
      .sort((a, b) => b.href.length - a.href.length)[0] ??
    pages[0];

  return (
    <SessionDrawer>
      <div className="h-[100dvh] flex flex-col bg-base-100">
        <TopBar bg={bg} trailing={trailing}>
          <div className="flex items-center gap-1.5 min-w-0">
            {leading}
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
                {pages.map((page) => (
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
        </TopBar>

        {children}
      </div>
    </SessionDrawer>
  );
}
