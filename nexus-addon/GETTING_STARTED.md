# Getting started — building & running the gw2logs Nexus addon

A complete, assume-nothing walkthrough: from a fresh Windows PC to seeing your
own arcdps logs auto-upload and raid reminders pop in-game. **No prior C++ or
compiling experience needed** — you'll copy/paste a few commands.

- **Platform:** Windows 10/11 (Guild Wars 2 is Windows-only, and so is Nexus).
- **Time:** ~45–60 min, most of it waiting on Visual Studio to install.
- **Difficulty:** beginner-friendly if you follow in order. Don't skip steps.

At the end you'll have a file called **`gw2logs.dll`** that you drop into Guild
Wars 2's addons folder.

---

## The big picture (read this once)

The addon is a small program that runs *inside* Guild Wars 2 through **Nexus**
(an addon manager). It does two things:

1. Watches the folder where **arcdps** saves your combat logs, and uploads each
   new one to your gw2logs account.
2. Asks the gw2logs website when your groups raid, and pops an in-game reminder
   beforehand.

To do that safely it uses a **personal access token** (like a password just for
the addon) that you create on the website.

You'll: **(1)** install the build tools → **(2)** install Nexus + arcdps in the
game → **(3)** make a token on the website → **(4)** download this code →
**(5)** build the DLL → **(6)** install & configure it → **(7)** test.

---

## Part 1 — Install the build tools

### 1.1 Visual Studio 2026 Community (free)

> **"Visual Studio" ≠ "Visual Studio Code".** The **Desktop development with
> C++** option you want is a *workload* inside **Visual Studio 2026** (the full
> IDE) — Visual Studio *Code* is a separate, lightweight editor that has no such
> workload. Install Visual Studio 2026 below. (If you love the VS Code editor
> you can still write code in it, but the C++ compiler/workload has to come from
> Visual Studio or its "Build Tools" package — so install this either way.)

1. Go to <https://visualstudio.microsoft.com/downloads/> and download
   **Visual Studio 2026 Community** (free) — the full IDE.
2. Run the installer. When it shows **Workloads**, tick:
   - ✅ **Desktop development with C++**
   That single workload gives you the compiler (MSVC), the Windows SDK, and
   CMake — everything needed.
3. Click **Install**. This is the long part (several GB). Reboot if it asks.

### 1.2 Git

Download and install **Git for Windows** from <https://git-scm.com/download/win>.
Accept all the defaults. This lets you download the code (and its dependencies)
in one command.

> **Checkpoint:** open the Start menu and confirm you can find
> **"x64 Native Tools Command Prompt for VS 2026"**. You'll use it to build.
> If it's there, Part 1 worked.

---

## Part 2 — Install Nexus and arcdps in Guild Wars 2

### 2.1 Nexus

1. Go to <https://raidcore.gg/gw2/nexus> and follow its installer/instructions to
   add Nexus to your Guild Wars 2 install.
2. Launch the game. Press the default Nexus key (**Ctrl + O**) — the Nexus window
   should appear. If it does, Nexus is working.

### 2.2 arcdps (the log recorder)

The addon uploads arcdps logs, so you need arcdps recording them:

1. Install **arcdps** (many players get it through Nexus's own addon library, or
   from deltaconnected's site). 
2. Make sure arcdps **combat logging** is enabled so it writes `.zevtc` files.
   By default they land in:
   ```
   C:\Users\<you>\Documents\Guild Wars 2\addons\arcdps\arcdps.cbtlogs
   ```
   Do a quick fight (even a training golem) and confirm a `.zevtc` file appears
   in a subfolder there. **Remember this folder** — you'll paste it into the
   addon later (though it's also the addon's default).

---

## Part 3 — Create your access token on the website

1. Sign in to your gw2logs website.
2. Go to **Account** → the **Desktop & addon access** card.
3. Type a name (e.g. `My PC`) and click **Create token**.
4. A long token starting with `gw2logs_pat_` appears **once**. Click **Copy** and
   paste it somewhere safe for a minute (Notepad). If you lose it, just make a
   new one — no harm done.

---

## Part 4 — Download the code and its dependencies

### 4.1 Clone the repo (with submodules)

The addon needs the Nexus + ImGui SDK headers. They're wired in as **git
submodules**, so one recursive clone gets everything. Open the
**x64 Native Tools Command Prompt for VS 2026** and run (replace the URL with
your gw2logs repository):

```bat
cd %USERPROFILE%\source
git clone --recursive <your-gw2logs-repo-url> gw2logs
cd gw2logs\nexus-addon
```

> Already cloned without `--recursive`? Run this from `nexus-addon`:
> ```bat
> git submodule update --init --recursive
> ```

### 4.2 The JSON library (already included)

The JSON single-header this addon uses is now committed in the repo at
`nexus-addon\include\nlohmann\json.hpp`, so a normal clone already has it —
nothing to do here.

> If that file is ever missing, download **`json.hpp`** from
> <https://github.com/nlohmann/json/releases/latest> (under "Assets") and drop
> it at exactly `nexus-addon\include\nlohmann\json.hpp`.

> **Checkpoint:** inside `nexus-addon` you should now have `src\nexus\Nexus.h`,
> `src\imgui\imgui.h`, and `include\nlohmann\json.hpp`. If all three exist,
> you're ready to build.

---

## Part 5 — Build the DLL

Still in the **x64 Native Tools Command Prompt**, from the `nexus-addon` folder:

```bat
cmake -B build -A x64
cmake --build build --config Release
```

- The first command generates a Visual Studio project in a new `build\` folder.
  With no `-G` flag, CMake auto-picks the newest Visual Studio you have
  installed (2026), so you don't have to name a version.
- The second compiles it.

> Want to pin the version explicitly? Add the generator flag —
> `cmake -B build -G "Visual Studio 18 2026" -A x64`. If CMake replies that it
> doesn't know that generator, your CMake is older than VS 2026: update CMake
> (or just drop the `-G` flag as shown above and let it auto-detect).

When it finishes you'll have:

```
nexus-addon\build\Release\gw2logs.dll
```

That's your addon. 🎉

> Prefer clicking? You can instead open Visual Studio 2026 → **Open a local
> folder** → pick `nexus-addon`. VS reads `CMakeLists.txt` automatically; choose
> the **x64-Release** configuration and **Build → Build All**. The DLL lands in
> a `out\build\...` folder — search for `gw2logs.dll`.

If the build fails, jump to **Troubleshooting** below.

---

## Part 6 — Install the addon

1. Close Guild Wars 2 if it's running.
2. Copy `gw2logs.dll` into your Guild Wars 2 **addons** folder — the same place
   Nexus lives, typically:
   ```
   <your GW2 install>\addons\
   ```
3. Start the game, open Nexus (**Ctrl + O**) → **Addons**. You should see
   **gw2logs** in the list. Enable it if it isn't already.

---

## Part 7 — Configure the addon (in-game)

1. In Nexus → **Addons**, click **gw2logs**, then its **Options**.
2. Fill in:
   - **Server URL** — your gw2logs API base. This is your site address with
     `/api` on the end, e.g. `https://gw2logs.example.com/api` (no trailing slash).
   - **Access token** — paste the `gw2logs_pat_…` token from Part 3.
   - **Log folder** — leave the default unless your arcdps logs live elsewhere.
   - **Auto-upload logs** — on.
   - **Upload as private** — optional (keeps uploads off the public site).
   - **Raid reminders** — on, and set **Lead time** (e.g. 15 minutes before).
3. Click **Save & apply**, then **Test connection**. The status line should read
   **"connected as \<your account\>"**. If it does, you're done configuring.

---

## Part 8 — Test it

**Auto-upload:** hit a golem or run an encounter so arcdps writes a new
`.zevtc`. Within a few seconds the addon's status line shows *"Uploaded
&lt;file&gt;"*, and the log appears on your gw2logs account. (The addon waits until
arc has finished writing the file, so expect a couple seconds' delay.)

**Reminders:** the simplest test is to temporarily set one of your groups'
raid/fractal time (on the website) to a few minutes from now and your lead time
to cover it. When the moment arrives you'll get an in-game Nexus alert like
*"Sunday Reclears raid starts in 3 min"*. Put the schedule back afterwards.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `The source directory does not appear to contain CMakeLists.txt` | You're in the wrong folder. `CMakeLists.txt` is in **`nexus-addon`**, not the repo root. Run `cd <your clone>\gw2logs\nexus-addon`, confirm with `dir CMakeLists.txt`, then re-run cmake. In VS "Open Folder", open the `nexus-addon` subfolder specifically. |
| `cmake` isn't recognized | You're not in the **x64 Native Tools Command Prompt for VS 2026**. Open that specific prompt (Start menu), not a plain `cmd`. |
| `Cannot open include file: 'nexus/Nexus.h'` | Submodules didn't download. From `nexus-addon` run `git submodule update --init --recursive`. |
| `Cannot open include file: 'nlohmann/json.hpp'` | You missed Part 4.2. Put `json.hpp` at `nexus-addon\include\nlohmann\json.hpp`. |
| Build fails with lots of ImGui errors | Your ImGui submodule didn't fully clone — rerun the submodule command above. |
| gw2logs not listed in Nexus | The DLL is in the wrong folder, or it's the 32-bit build. Make sure you built **x64** and copied to `<GW2>\addons\`. |
| "Test connection" says HTTP 401 | Wrong/expired token, or Server URL missing `/api`. Recreate the token and re-check the URL. |
| "Test connection" fails to connect | Server URL typo, or your site isn't reachable. Open the URL + `/reminders` in a browser (while logged in) to sanity-check. |
| Logs don't upload | Check the **Log folder** is your real arcdps `arcdps.cbtlogs` path, and that arcdps is actually writing `.zevtc` files there. |
| Reminders never fire | Confirm the group has a raid/fractal schedule set on the website, that you're a **member**, and that reminders are enabled with a sensible lead time. |

Nexus writes a log you can read for errors: look for a **gw2logs** channel in
Nexus's log window (the addon logs each upload attempt and any failures there).

---

## Updating later

- **New code:** `git pull` in the repo, then `git submodule update --init
  --recursive`, then re-run the two `cmake` commands and re-copy the DLL.
- **Nexus updated its ImGui:** if a future Nexus update changes ImGui, pull the
  `src/imgui` submodule to the matching version and rebuild, so your addon's
  ImGui matches Nexus's.

---

## Appendix — how the pieces talk (for the curious)

- The addon calls your site's API with the token in an `Authorization: Bearer`
  header. `GET /auth/me` validates the token, `POST /uploads` sends a log,
  `GET /reminders` returns your groups with each raid/fractal's **next start as
  an absolute UTC time** — the addon just compares that to your PC clock, so
  there's no timezone math to get wrong.
- All the Nexus-specific calls live in a few helper functions at the top of
  `src/Addon.cpp` (`NxLog`, `NxAlert`, `NxAddonDir`) and in `Load`/`Unload`.
  They target **Nexus API v6**; the exact member names (`GUI_Register`,
  `GUI_SendAlert`, `Paths_GetAddonDirectory`, `Log`) match `src/nexus/Nexus.h`
  in this repo. If you ever bump the Nexus submodule and something no longer
  compiles, that header is the source of truth for the new names.
