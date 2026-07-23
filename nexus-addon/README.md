# gw2logs — Nexus addon

An in-game companion for the gw2logs platform, built as a [Nexus](https://raidcore.gg/gw2/nexus)
addon. Two features, both headless (no in-game browsing):

1. **Auto-upload logs** — watches your arcdps combat-log folder and uploads each
   new `.zevtc` to your gw2logs account automatically.
2. **Raid reminders** — shows an in-game alert before each of your groups' raid
   (and fractal) nights, using the schedules you set on the website.

Both authenticate with a **personal access token** you generate on the website
(Account → *Desktop & addon access*) and paste into the addon once.

> **New to this? Read [`GETTING_STARTED.md`](GETTING_STARTED.md)** — a complete,
> assume-nothing walkthrough from installing the tools to seeing your first
> auto-uploaded log in-game.

---

## What's here

| File | Role |
|---|---|
| `src/Addon.cpp` | Entry points (`GetAddonDef`/`Load`/`Unload`), the ImGui options panel, orchestration |
| `src/HttpClient.h` | WinHTTP: authenticated GET + multipart file POST (no external HTTP lib) |
| `src/LogWatcher.h` | `ReadDirectoryChangesW` thread → new, size-stable `.zevtc` → upload |
| `src/Reminders.h` | Polls `GET /reminders` → fires an alert before each raid/fractal |
| `src/Settings.h` | Config load/save as JSON |
| `CMakeLists.txt` | Alternative build (the template `.sln` route is easier — see the guide) |

The code targets **Nexus API v6** (`RCGG-lib-nexus-api`) and calls the real API
members (`GUI_Register`, `GUI_SendAlert`, `Paths_GetAddonDirectory`, `Log`, …).
All Nexus calls funnel through small glue helpers at the top of `Addon.cpp`, so
if a future SDK renames something, that's the only place to touch.

## Dependencies (git submodules, template layout)

- `src/nexus/` ← https://github.com/RaidcoreGG/RCGG-lib-nexus-api (the `Nexus.h` API)
- `src/imgui/` ← https://github.com/RaidcoreGG/imgui (options panel UI)
- `src/mumble/` ← https://github.com/RaidcoreGG/RCGG-lib-mumble-api (optional)
- `include/nlohmann/json.hpp` ← https://github.com/nlohmann/json (single header)

Everything else uses the Windows SDK only (WinHTTP, `ReadDirectoryChangesW`).

## How it maps to the gw2logs API

| Addon action | Request |
|---|---|
| Validate token / greet | `GET /auth/me` with `Authorization: Bearer <token>` |
| Upload a log | `POST /uploads` — multipart `file`, optional `private`, `groupId` |
| Fetch schedules | `GET /reminders` — groups with `raid`/`fractal.nextStartUtc` (absolute UTC) |

The server precomputes each schedule's next occurrence as an absolute UTC
instant, so the addon only compares against the system clock — no timezone math
on the client.

## Heads-up

This can't be compiled on the gw2logs web repo's CI (it needs Windows + MSVC +
the DirectX/Nexus/ImGui headers). Build it locally per
[`GETTING_STARTED.md`](GETTING_STARTED.md). The Win32/C++ pieces are complete;
the first Windows build is where you confirm the SDK member names against your
exact `src/nexus/Nexus.h`.
