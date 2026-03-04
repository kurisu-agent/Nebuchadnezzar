"use client";

import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  type Ref,
} from "react";
import {
  SLASH_COMMANDS,
  filterCommands,
  type SlashCommand,
} from "@/lib/slash-commands";

const CATEGORIES: { key: SlashCommand["category"]; label: string }[] = [
  { key: "neb", label: "Nebuchadnezzar" },
  { key: "git", label: "Git" },
  { key: "session", label: "Session" },
  { key: "help", label: "Help" },
];

export interface SlashCommandPickerHandle {
  show: () => void;
  hide: () => void;
  toggle: () => void;
}

interface SlashCommandPickerProps {
  /** When set, filters the list (e.g. "/co"). Empty string = show all. */
  query: string;
  onSelect: (command: string) => void;
  highlightedIndex: number;
  popoverId: string;
  anchorName: string;
}

export const SlashCommandPicker = forwardRef(function SlashCommandPicker(
  {
    query,
    onSelect,
    highlightedIndex,
    popoverId,
    anchorName,
  }: SlashCommandPickerProps,
  ref: Ref<SlashCommandPickerHandle>,
) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useImperativeHandle(ref, () => ({
    show: () => popoverRef.current?.showPopover(),
    hide: () => popoverRef.current?.hidePopover(),
    toggle: () => popoverRef.current?.togglePopover(),
  }));

  const isFiltering = query.replace(/^\//, "").length > 0;
  const filtered = isFiltering ? filterCommands(query) : SLASH_COMMANDS;

  // Scroll highlighted item into view
  useEffect(() => {
    itemRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const renderItem = (cmd: SlashCommand, idx: number) => (
    <li key={cmd.command}>
      <button
        ref={(el) => {
          itemRefs.current[idx] = el;
        }}
        onClick={() => onSelect(cmd.command)}
        className={`flex items-center gap-3 w-full min-h-[48px] active:bg-base-300 ${
          idx === highlightedIndex ? "bg-base-300" : ""
        }`}
      >
        <cmd.icon size={20} weight="duotone" className="opacity-60 shrink-0" />
        <div className="flex flex-col items-start">
          <span className="font-mono text-sm">{cmd.command}</span>
          <span className="text-xs opacity-50">{cmd.description}</span>
        </div>
      </button>
    </li>
  );

  // Flat index counter for highlight tracking across categories
  let flatIdx = 0;

  return (
    <div
      ref={popoverRef}
      id={popoverId}
      popover="auto"
      className="dropdown dropdown-top bg-base-200 border border-base-300 rounded-xl shadow-[0_-4px_40px_rgba(0,0,0,0.5)] w-[calc(100%-1.5rem)] max-h-72 overflow-y-auto p-0 mb-2"
      style={{ positionAnchor: anchorName } as React.CSSProperties}
    >
      {isFiltering ? (
        <>
          <div className="px-3 py-2 text-xs opacity-40 uppercase tracking-wide sticky top-0 bg-base-200/90 backdrop-blur-sm">
            Commands
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 pb-3">
              <span className="text-xs opacity-40">No matching commands</span>
            </div>
          ) : (
            <ul className="menu menu-sm w-full p-1 pt-0">
              {filtered.map((cmd, i) => renderItem(cmd, i))}
            </ul>
          )}
        </>
      ) : (
        CATEGORIES.map(({ key, label }) => {
          const cmds = SLASH_COMMANDS.filter((c) => c.category === key);
          if (cmds.length === 0) return null;
          const section = (
            <div key={key}>
              <div className="px-3 py-1.5 text-xs opacity-40 uppercase tracking-wide">
                {label}
              </div>
              <ul className="menu menu-sm w-full px-1">
                {cmds.map((cmd) => {
                  const node = renderItem(cmd, flatIdx);
                  flatIdx++;
                  return node;
                })}
              </ul>
            </div>
          );
          return section;
        })
      )}
    </div>
  );
});
