# gw2logs — Nexus addon

An in-game companion for the gw2logs platform, built as a [Nexus](https://raidcore.gg/gw2/nexus)
addon. Two features, both headless (no in-game browsing):

1. **Auto-upload logs** — watches your arcdps combat-log folder and uploads each
   new `.zevtc` to your gw2logs account automatically.
2. **Raid reminders** — shows an in-game alert before each of your groups' raid
   (and fractal) nights, using the schedules you set on the website.

Both authenticate with a **personal access token** you generate on the website
(Account → *Desktop & addon access*) and paste into the addon once.

---

## Status: scaffold

This is a working **starting point**, not a shipped binary. The standard C++ /
Win32 pieces (HTTP, file-watching, settings, reminder scheduling) are complete;
the **Nexus glue is isolated in `src/Nexus.h` + the `Load`/`Unload` path of
`Addon.cpp`** and must be reconciled against the exact Nexus API version you
build against — the `AddonAPI` struct layout and field names have shifted
between Nexus API versions, and only the official header is authoritative.

> Search for `NEXUS-RECONCILE` in the source for every spot to check against the
> real SDK.

It cannot be compiled on the build server this was authored on (needs Windows +
MSVC + the DirectX/Nexus/ImGui headers); build it locally per below.

---

## Prerequisites

- Windows, Visual Studio 2022 (or Build Tools) with the **Desktop C++** workload
- CMake ≥ 3.21
- The **Nexus SDK header** (`Nexus.h`) from <https://github.com/RaidcoreGG/Nexus>
  — drop the real one over `include/Nexus.official.h` and flip the include (see
  `src/Nexus.h`). The trimmed `include/Nexus.h` here exists only so the scaffold
  reads cleanly.
- **Dear ImGui** headers (the same version Nexus ships) on the include path, for
  the options panel.
- **[nlohmann/json](https://github.com/nlohmann/json)** single header at
  `include/nlohmann/json.hpp`.

No other third-party libraries: HTTP uses **WinHTTP** (built into Windows), file
watching uses **ReadDirectoryChangesW**.

## Build

```powershell
cmake -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
```

Output: `build/Release/gw2logs.dll`.

## Install

Copy `gw2logs.dll` into your Guild Wars 2 `addons` folder (the same folder
Nexus lives in), then enable it from Nexus's **Addons** panel. For sharing,
publish the DLL on a GitHub release and set the addon's update provider to
GitHub (see `AddonDefinition` in `Addon.cpp`) so Nexus can auto-update it.

## Configure (in-game)

Open Nexus → **Addons → gw2logs → Options**:

- **Server URL** — your gw2logs API base, e.g. `https://gw2logs.example.com/api`
- **Access token** — paste the token from the website (Account → *Desktop &
  addon access*). The addon calls `GET /auth/me` to validate it and greet you.
- **Log folder** — defaults to
  `%USERPROFILE%\Documents\Guild Wars 2\addons\arcdps\arcdps.cbtlogs`
- **Auto-upload** on/off, **upload as private** on/off, optional **default group**
- **Reminders** on/off and **lead time** (minutes before start)

Settings persist to `<addon dir>/gw2logs/settings.json`.

---

## How it maps to the gw2logs API

| Addon action | Request |
|---|---|
| Validate token / greet | `GET /auth/me` with `Authorization: Bearer <token>` |
| Upload a log | `POST /uploads` — multipart `file`, optional `private`, `groupId` |
| Fetch schedules | `GET /reminders` — groups with `raid`/`fractal.nextStartUtc` (absolute UTC) |

The server precomputes each schedule's next occurrence as an absolute UTC
instant, so the addon only compares against the system clock — no timezone math
on the client.

## Architecture

```
Addon.cpp      entry points (GetAddonDef / Load / Unload), options UI, orchestration
Nexus.h        trimmed Nexus API subset — RECONCILE with the official SDK header
Settings.h     load/save config as JSON
HttpClient.h   WinHTTP: GET (+bearer) and POST multipart/form-data
LogWatcher.h   ReadDirectoryChangesW thread → new .zevtc → upload queue
Reminders.h    poll /reminders → fire an alert at (nextStart - leadTime), once each
```

Everything network- or disk-facing runs on background threads; the only main-
thread work is the ImGui options panel.
