"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ChatsCircle,
  GearSix,
  FolderOpen,
  GitBranch,
  Globe,
} from "@phosphor-icons/react";
import {
  SubMenuLayout,
  type SubMenuPage,
} from "@/app/components/submenu-layout";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  const project = useQuery(api.projects.get, {
    id: id as Id<"projects">,
  });

  const pages: SubMenuPage[] = [
    { label: "Sessions", href: `/project/${id}/sessions`, icon: ChatsCircle },
    { label: "Files", href: `/project/${id}/files`, icon: FolderOpen },
    { label: "Git", href: `/project/${id}/git`, icon: GitBranch },
    { label: "Ports", href: `/project/${id}/ports`, icon: Globe },
    { label: "Settings", href: `/project/${id}/settings`, icon: GearSix },
  ];

  if (project === undefined) {
    return (
      <SubMenuLayout pages={pages}>
        <div className="flex-1 flex items-center justify-center">
          <span className="loading loading-spinner loading-sm opacity-50" />
        </div>
      </SubMenuLayout>
    );
  }

  if (project === null || project.deletedAt) {
    return (
      <SubMenuLayout pages={pages}>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-base-content/40">Project not found.</p>
        </div>
      </SubMenuLayout>
    );
  }

  return (
    <SubMenuLayout
      pages={pages}
      trailing={
        <span
          className="text-xs font-semibold truncate max-w-[120px] pr-1"
          style={{ color: project.color }}
        >
          {project.name}
        </span>
      }
    >
      {children}
    </SubMenuLayout>
  );
}
