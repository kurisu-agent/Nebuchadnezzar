import {
  GitCommit,
  GitPullRequest,
  GitFork,
  Images,
  FileText,
  ArrowsInSimple,
  Broom,
  Question,
  Bug,
  type Icon,
} from "@phosphor-icons/react";

export type CommandCategory = "neb" | "git" | "session" | "help";

export interface SlashCommand {
  command: string;
  label: string;
  description: string;
  icon: Icon;
  category: CommandCategory;
  /** If true, this is an action handled by the UI, not a slash command sent to the agent. */
  isAction?: boolean;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "fork",
    label: "Fork Session",
    description: "Fork this session into a new one",
    icon: GitFork,
    category: "neb",
    isAction: true,
  },
  {
    command: "media",
    label: "Media",
    description: "Browse uploads and screenshots",
    icon: Images,
    category: "neb",
    isAction: true,
  },
  {
    command: "/commit",
    label: "Commit",
    description: "Create a git commit",
    icon: GitCommit,
    category: "git",
  },
  {
    command: "/review-pr",
    label: "Review PR",
    description: "Review a pull request",
    icon: GitPullRequest,
    category: "git",
  },
  {
    command: "/init",
    label: "Init",
    description: "Initialize CLAUDE.md",
    icon: FileText,
    category: "session",
  },
  {
    command: "/compact",
    label: "Compact",
    description: "Compact conversation context",
    icon: ArrowsInSimple,
    category: "session",
  },
  {
    command: "/clear",
    label: "Clear",
    description: "Clear conversation history",
    icon: Broom,
    category: "session",
  },
  {
    command: "/help",
    label: "Help",
    description: "Get help with Claude Code",
    icon: Question,
    category: "help",
  },
  {
    command: "/bug",
    label: "Bug Report",
    description: "Report a bug in Claude Code",
    icon: Bug,
    category: "help",
  },
];

export function filterCommands(query: string): SlashCommand[] {
  const q = query.toLowerCase().replace(/^\//, "");
  if (!q) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.command.toLowerCase().includes(q) ||
      cmd.label.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q),
  );
}
