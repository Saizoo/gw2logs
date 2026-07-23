// Trimmed subset of the Nexus addon API — ENOUGH to make this scaffold read and
// (once you add the real SDK) compile. It is NOT authoritative.
//
// NEXUS-RECONCILE: replace this with the official header from
//   https://github.com/RaidcoreGG/Nexus  (Nexus.h / AddonAPI definition)
// and make sure the fields this addon uses still line up:
//   - Register/Deregister an OptionsRender callback
//   - a logger
//   - "get addon directory" path helper
//   - an "alert"/notify function
// The AddonAPI struct has been reorganised across API versions (flat vs. nested
// Renderer/Paths/UI/QuickAccess groups); adjust src/Nexus.h accessors to match.
#pragma once

#include <Windows.h>

struct ImGuiContext;
struct IDXGISwapChain;

#ifndef NEXUS_API_VERSION
#define NEXUS_API_VERSION 6
#endif

typedef enum ELogLevel {
    ELogLevel_OFF = 0,
    ELogLevel_CRITICAL = 1,
    ELogLevel_WARNING = 2,
    ELogLevel_INFO = 3,
    ELogLevel_DEBUG = 4,
    ELogLevel_TRACE = 5,
} ELogLevel;

typedef enum ERenderType {
    ERenderType_PreRender = 0,
    ERenderType_Render = 1,
    ERenderType_PostRender = 2,
    ERenderType_OptionsRender = 3,
} ERenderType;

typedef enum EAddonFlags {
    EAddonFlags_None = 0,
    EAddonFlags_IsVolatile = 1,
    EAddonFlags_DisableHotloading = 2,
} EAddonFlags;

typedef enum EUpdateProvider {
    EUpdateProvider_None = 0,
    EUpdateProvider_Raidcore = 1,
    EUpdateProvider_GitHub = 2,
    EUpdateProvider_Direct = 3,
} EUpdateProvider;

typedef struct AddonVersion {
    signed short Major;
    signed short Minor;
    signed short Build;
    signed short Revision;
} AddonVersion;

typedef void (*GUI_RENDER)(void);
typedef void (*ADDON_LOAD)(void* aApi);
typedef void (*ADDON_UNLOAD)(void);

typedef void (*LOGGER_LOGA)(ELogLevel aLogLevel, const char* aChannel, const char* aStr);
typedef void (*GUI_ADDRENDER)(ERenderType aRenderType, GUI_RENDER aRenderCallback);
typedef void (*GUI_REMRENDER)(GUI_RENDER aRenderCallback);
typedef const char* (*PATHS_GETADDONDIR)(const char* aName);
typedef void (*ALERTS_NOTIFY)(const char* aMessage);

// Flat AddonAPI subset. Only the members this addon touches are declared; the
// real struct has many more (keybinds, events, textures, data-link, quick
// access, localization, WndProc, …). Order does not matter for a subset you
// only ever read by name — but the NAMES and SIGNATURES must match the SDK.
typedef struct AddonAPI {
    IDXGISwapChain* SwapChain;
    ImGuiContext*   ImguiContext;
    void*           ImguiMalloc;
    void*           ImguiFree;

    GUI_ADDRENDER     RegisterRender;    // NEXUS-RECONCILE (Renderer.Register)
    GUI_REMRENDER     DeregisterRender;  // NEXUS-RECONCILE (Renderer.Deregister)

    PATHS_GETADDONDIR GetAddonDirectory; // NEXUS-RECONCILE (Paths.GetAddonDirectory)

    LOGGER_LOGA       Log;               // NEXUS-RECONCILE (Log / Logger)

    ALERTS_NOTIFY     SendAlert;         // NEXUS-RECONCILE (UI.SendAlert / Alerts.Notify)
} AddonAPI;

typedef struct AddonDefinition {
    signed int      Signature;
    signed int      APIVersion;
    const char*     Name;
    AddonVersion    Version;
    const char*     Author;
    const char*     Description;
    ADDON_LOAD      Load;
    ADDON_UNLOAD    Unload;
    EAddonFlags     Flags;
    EUpdateProvider Provider;
    const char*     UpdateLink;
} AddonDefinition;
