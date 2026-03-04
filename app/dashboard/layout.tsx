"use client";

import {
  Info,
  FileCode,
  GearSix,
  Palette,
  FolderSimple,
  Trash,
  Terminal,
  ImageSquare,
  Globe,
  Key,
} from "@phosphor-icons/react";
import {
  SubMenuLayout,
  type SubMenuPage,
} from "@/app/components/submenu-layout";

const PAGES: SubMenuPage[] = [
  { label: "About", href: "/dashboard", icon: Info },
  { label: "Uploads", href: "/dashboard/uploads", icon: ImageSquare },
  { label: "Claude Config", href: "/dashboard/files", icon: FileCode },
  { label: "Settings", href: "/dashboard/settings", icon: GearSix },
  { label: "Appearance", href: "/dashboard/appearance", icon: Palette },
  { label: "Projects", href: "/dashboard/projects", icon: FolderSimple },
  { label: "Ports", href: "/dashboard/ports", icon: Globe },
  { label: "Keys", href: "/dashboard/keys", icon: Key },
  { label: "Prompt", href: "/dashboard/prompt", icon: Terminal },
  { label: "Trash", href: "/dashboard/trash", icon: Trash },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SubMenuLayout pages={PAGES}>{children}</SubMenuLayout>;
}
