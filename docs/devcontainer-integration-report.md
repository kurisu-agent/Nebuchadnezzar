# Devcontainer Integration Report

Report on work done in the `feat/devcontainer-integration` branch of [claudecodeui](https://github.com/kurisu-agent/claudecodeui). This is a reference document, not a plan — it captures what was built and the rationale behind each decision.

## Goal

Run Claude Code sessions inside devcontainers so that the AI agent has access to the project's actual runtimes, dependencies, and toolchain rather than whatever happens to be installed on the host. The Claude Code UI already manages sessions through the Claude SDK; devcontainer support needed to transparently redirect those sessions into a container.

## How It Works

### Proxy Script Architecture

The SDK normally spawns Claude as a local subprocess. To run inside a container instead, we inject a **proxy script** (`~/.claude/devcontainer-proxy.sh`) that replaces the Claude executable path. The SDK's stdio gets forwarded through `devcontainer exec` into the running container, where the real `claude` binary handles the conversation.

The proxy script is written on-the-fly by `ensureProxyScript()` and pointed to via the SDK's `pathToClaudeCodeExecutable` option. It accepts the workspace folder as its first argument and passes everything else through to `claude` inside the container.

### Container Lifecycle (`server/devcontainer.js`)

The core module handles:

- **Detection** — checks for `.devcontainer/devcontainer.json` or `.devcontainer.json` in the project root.
- **Status** — queries `docker ps` with label filtering (`devcontainer.local_folder=<path>`), cached for 30 seconds to avoid hammering Docker.
- **Start** — calls `devcontainer up` with:
  - The official `ghcr.io/anthropics/devcontainer-features/claude-code:1` feature injected so `claude` is available in the container.
  - Selective bind mounts for auth/config (see below).
  - An override config for IPv6 disabling and user detection.
  - The `ANTHROPIC_API_KEY` passed through as a remote env var.
- **Stop** — `docker stop` on the labeled container.
- **Verify** — after starting, runs `claude --version` inside the container. If it fails (e.g. reused stale container without the feature), destroys and rebuilds.

### Selective Credential Mounting

Rather than mounting the entire `~/.claude` directory (which caused ghost project pollution and session cross-contamination), individual files are bind-mounted to `/opt/.host-claude` inside the container:

- `.credentials.json`
- `CLAUDE.md`
- `settings.json`
- `project-config.json`
- `plugins/` directory

After `devcontainer up`, symlinks are created from `$HOME/.claude/<file>` to the mount targets inside the container. This gives Claude access to auth and config without leaking host-side session data.

### Session Directory Isolation

A dedicated `--devcontainer` suffixed session directory is created on the host:

```
~/.claude/projects/<encoded-project-path>--devcontainer/
```

This is bind-mounted to `/opt/.host-claude/sessions` and symlinked to the container's expected project session path. The suffix prevents host and container sessions from interfering with each other. The project list API filters out `--devcontainer` directories so they don't appear as separate projects.

### Non-Root User Detection

Many devcontainer images create a non-root user (UID >= 1000) but default to `root` if `remoteUser` isn't set in the config. The start routine detects this situation:

1. Start the container normally.
2. If running as root and no explicit `remoteUser` in devcontainer.json, shell in and query `getent passwd` for a user with UID >= 1000.
3. If found, save `remoteUser` to a persistent override config, destroy the root container, and rebuild as the detected user.

The override config is persisted at `~/.claude/.devcontainer-overrides/<project>.json` so subsequent starts don't repeat the detection.

### IPv6 Disabling

Dev servers (Vite, Astro, etc.) often bind to `::1` (IPv6 loopback) by default, which the Coder port scanner can't see. The override config injects `--sysctl=net.ipv6.conf.all.disable_ipv6=1` via `runArgs`, forcing servers to bind to IPv4 where Coder can detect and proxy them.

Since `--override-config` replaces the entire devcontainer config rather than merging, the override is built by reading the full base `devcontainer.json` first, then layering on the saved overrides and the sysctl injection.

## API Endpoints (`server/routes/devcontainer.js`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/devcontainer/:projectName/status` | Detection + running status |
| POST | `/api/devcontainer/:projectName/start` | Start container |
| POST | `/api/devcontainer/:projectName/stop` | Stop container |

A separate `/api/projects/file` endpoint was added for serving project files (used by the inline image rendering feature on this branch, not devcontainer-specific).

## UI Changes

### Per-Session Container Toggle

Instead of a global "devcontainer mode" toggle, each session carries a `useDevcontainer` flag. The sidebar's new-session UI shows a **Host / Container segmented toggle** when a devcontainer is detected for the project. This lets you have some sessions on the host and others in the container simultaneously.

### Status Indicator (`DevcontainerIndicator.jsx`)

A container icon in the chat toolbar and session list shows container state:

| Color | Meaning |
|-------|---------|
| Green | Running |
| Gray | Available but stopped |
| Yellow (pulsing) | Starting/stopping |
| Red | Error |
| Hidden | No devcontainer config |

### Sidebar Enhancements

- Start/stop buttons with tooltips for container lifecycle.
- Session list entries show a container icon for devcontainer sessions.
- Project list filters out `--devcontainer` session directories.

## Other Changes on This Branch

Several changes landed on this branch that aren't devcontainer-specific:

- **"YOLO" rename** — "Bypass Permissions" renamed to "YOLO" in the permission mode UI.
- **Default model option** — added a "Default" model choice that omits the model parameter, letting the CLI use its own default.
- **Inline image rendering** — when the Read tool is used on an image file, the image renders inline in the chat.
- **Text wrap toggle** — quick-access word wrap button in the code editor toolbar.
- **Toolbar cleanup** — hid the thinking mode selector, removed clutter buttons, restructured layout.
- **Permission mode initialization** — fixed bug where new sessions didn't inherit the permission mode from settings.
- **Tool error fix** — stopped showing "Grant permission for Bash" on any tool error; now only shown for actual permission denials.

## Known Issues and Rough Edges

- **Startup time** — first `devcontainer up` can take minutes for image builds. The UI shows a pulsing indicator but there's no progress feedback.
- **Override config fragility** — since `--override-config` replaces rather than merges, the full base config must be read and re-serialized. If the base config uses comments (JSONC) or features that don't survive a parse/stringify cycle, things can break.
- **Port forwarding** — relies on Coder's port scanner seeing IPv4 binds. Not all dev server frameworks respect the IPv6 disable sysctl.
- **Stale containers** — if a container was created before the Claude Code feature was added, the verify step destroys and rebuilds it, which can be surprising.
- **No `devcontainer.json` merging** — the override approach means users can't have both the override and their original config's `runArgs` unless the code explicitly merges them (which it does for `runArgs`, but not for all fields).
