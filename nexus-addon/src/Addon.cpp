// gw2logs — Nexus addon entry point. Wires the log watcher + reminder poller to
// the gw2logs API and renders the in-game options panel.
//
// NEXUS-RECONCILE: the Load()/Unload() glue and the g_api->* calls target the
// trimmed AddonAPI in include/Nexus.h. Swap in the official Nexus SDK header and
// adjust the accessor names/paths if your API version groups them differently.
#include <Windows.h>
#include <mutex>
#include <string>

#include <imgui.h>            // provided by the Nexus SDK include path
#include <nlohmann/json.hpp>

#include "Nexus.h"
#include "Settings.h"
#include "HttpClient.h"
#include "LogWatcher.h"
#include "Reminders.h"

using namespace gw2logs;

// --- global state -----------------------------------------------------------
static AddonAPI*  g_api = nullptr;
static std::mutex g_mtx;              // guards g_settings
static Settings   g_settings;
static std::string g_settingsPath;
static std::string g_status = "Not connected yet.";
static LogWatcher  g_watcher;
static Reminders   g_reminders;

// --- Nexus glue (single choke point; see NEXUS-RECONCILE) -------------------
static void NxLog(ELogLevel level, const std::string& msg) {
    if (g_api && g_api->Log) g_api->Log(level, "gw2logs", msg.c_str());
}
static void NxAlert(const std::string& msg) {
    if (g_api && g_api->SendAlert) g_api->SendAlert(msg.c_str());
    NxLog(ELogLevel_INFO, "alert: " + msg);
}
static std::string NxAddonDir(const char* append) {
    if (g_api && g_api->GetAddonDirectory) return std::string(g_api->GetAddonDirectory(append));
    return append ? std::string(append) : std::string();
}

static Settings SnapshotSettings() {
    std::lock_guard<std::mutex> lk(g_mtx);
    return g_settings;
}
static void SetStatus(const std::string& s) {
    std::lock_guard<std::mutex> lk(g_mtx);
    g_status = s;
}

static std::string BaseName(const std::string& path) {
    size_t slash = path.find_last_of("\\/");
    return slash == std::string::npos ? path : path.substr(slash + 1);
}

// --- log upload (runs on the watcher thread) --------------------------------
static void OnNewLog(const std::string& fullPath) {
    Settings s = SnapshotSettings();
    if (!s.uploadEnabled || s.token.empty() || s.serverUrl.empty()) return;

    std::vector<MultipartField> fields;
    if (s.uploadPrivate) fields.push_back({ "private", "true" });
    if (!s.defaultGroupId.empty()) fields.push_back({ "groupId", s.defaultGroupId });

    const std::string name = BaseName(fullPath);
    NxLog(ELogLevel_INFO, "uploading " + name);
    HttpResponse res = PostMultipartFile(s.serverUrl + "/uploads", s.token, fullPath, "file", name, fields);
    if (res.ok) {
        SetStatus("Uploaded " + name);
        NxLog(ELogLevel_INFO, "uploaded " + name);
    } else {
        const std::string why = res.error.empty() ? ("HTTP " + std::to_string(res.status)) : res.error;
        SetStatus("Upload failed (" + name + "): " + why);
        NxLog(ELogLevel_WARNING, "upload failed for " + name + ": " + why);
    }
}

static void RestartWatcher() {
    Settings s = SnapshotSettings();
    g_watcher.Stop();
    if (s.uploadEnabled && !s.EffectiveLogFolder().empty())
        g_watcher.Start(s.EffectiveLogFolder(), OnNewLog);
}

// --- options panel (ImGui, main render thread) ------------------------------
static bool  s_uiInit = false;
static char  s_url[512]{};
static char  s_token[256]{};
static char  s_folder[1024]{};
static char  s_group[128]{};
static Settings s_ui; // working copy edited by the panel, committed on Save

static void SyncUiFromSettings() {
    s_ui = SnapshotSettings();
    strncpy_s(s_url, s_ui.serverUrl.c_str(), _TRUNCATE);
    strncpy_s(s_token, s_ui.token.c_str(), _TRUNCATE);
    strncpy_s(s_folder, s_ui.EffectiveLogFolder().c_str(), _TRUNCATE);
    strncpy_s(s_group, s_ui.defaultGroupId.c_str(), _TRUNCATE);
    s_uiInit = true;
}

static void OptionsRender() {
    if (!s_uiInit) SyncUiFromSettings();

    ImGui::TextDisabled("gw2logs — auto-upload & raid reminders");
    ImGui::Separator();

    ImGui::InputText("Server URL", s_url, sizeof(s_url));
    ImGui::InputText("Access token", s_token, sizeof(s_token), ImGuiInputTextFlags_Password);
    ImGui::TextDisabled("Generate on the website: Account -> Desktop & addon access");

    ImGui::Spacing();
    ImGui::Checkbox("Auto-upload logs", &s_ui.uploadEnabled);
    ImGui::InputText("Log folder", s_folder, sizeof(s_folder));
    ImGui::Checkbox("Upload as private", &s_ui.uploadPrivate);
    ImGui::InputText("Default group id (optional)", s_group, sizeof(s_group));

    ImGui::Spacing();
    ImGui::Checkbox("Raid reminders", &s_ui.remindersEnabled);
    ImGui::InputInt("Lead time (minutes)", &s_ui.leadMinutes);
    if (s_ui.leadMinutes < 0) s_ui.leadMinutes = 0;

    ImGui::Spacing();
    if (ImGui::Button("Save & apply")) {
        {
            std::lock_guard<std::mutex> lk(g_mtx);
            g_settings = s_ui;
            g_settings.serverUrl = s_url;
            g_settings.token = s_token;
            g_settings.logFolder = s_folder;
            g_settings.defaultGroupId = s_group;
            SaveSettings(g_settingsPath, g_settings);
        }
        RestartWatcher(); // reminders picks up new settings on its next tick
        SetStatus("Settings saved.");
    }
    ImGui::SameLine();
    if (ImGui::Button("Test connection")) {
        HttpResponse me = Get(std::string(s_url) + "/auth/me", s_token);
        if (me.ok) {
            std::string who = "connected";
            try { who = "connected as " + nlohmann::json::parse(me.body).value("gw2AccountName", std::string("your account")); }
            catch (...) {}
            SetStatus(who);
        } else {
            SetStatus("Connection failed: " + (me.error.empty() ? ("HTTP " + std::to_string(me.status)) : me.error));
        }
    }

    ImGui::Spacing();
    ImGui::Separator();
    { std::lock_guard<std::mutex> lk(g_mtx); ImGui::TextWrapped("Status: %s", g_status.c_str()); }
}

// --- lifecycle --------------------------------------------------------------
static void AddonLoad(void* aApi) {
    g_api = static_cast<AddonAPI*>(aApi);

    // NEXUS-RECONCILE: share Nexus's ImGui context + allocators so our widgets
    // draw into the same context. Names/casts may differ by SDK version.
    if (g_api->ImguiContext) ImGui::SetCurrentContext(static_cast<ImGuiContext*>(g_api->ImguiContext));
    if (g_api->ImguiMalloc && g_api->ImguiFree)
        ImGui::SetAllocatorFunctions(reinterpret_cast<ImGuiMemAllocFunc>(g_api->ImguiMalloc),
                                     reinterpret_cast<ImGuiMemFreeFunc>(g_api->ImguiFree));

    g_settingsPath = NxAddonDir("gw2logs\\settings.json");
    {
        std::lock_guard<std::mutex> lk(g_mtx);
        g_settings = LoadSettings(g_settingsPath);
    }
    s_uiInit = false;

    if (g_api->RegisterRender) g_api->RegisterRender(ERenderType_OptionsRender, OptionsRender);

    RestartWatcher();
    g_reminders.Start([] { return SnapshotSettings(); },
                      [](const std::string& m) { NxAlert(m); },
                      [](const std::string& m) { NxLog(ELogLevel_INFO, m); });

    NxLog(ELogLevel_INFO, "gw2logs addon loaded");
}

static void AddonUnload() {
    if (g_api && g_api->DeregisterRender) g_api->DeregisterRender(OptionsRender);
    g_watcher.Stop();
    g_reminders.Stop();
    {
        std::lock_guard<std::mutex> lk(g_mtx);
        if (!g_settingsPath.empty()) SaveSettings(g_settingsPath, g_settings);
    }
    NxLog(ELogLevel_INFO, "gw2logs addon unloaded");
    g_api = nullptr;
}

// --- addon definition -------------------------------------------------------
extern "C" __declspec(dllexport) AddonDefinition* GetAddonDef() {
    static AddonDefinition def{};
    def.Signature = 0x6732004C;              // unique id for this addon ("g2..L")
    def.APIVersion = NEXUS_API_VERSION;
    def.Name = "gw2logs";
    def.Version = { 0, 1, 0, 0 };
    def.Author = "gw2logs";
    def.Description = "Auto-uploads arcdps logs to gw2logs and shows in-game raid reminders.";
    def.Load = AddonLoad;
    def.Unload = AddonUnload;
    def.Flags = EAddonFlags_None;
    // NEXUS-RECONCILE: point at your GitHub releases for auto-update.
    def.Provider = EUpdateProvider_GitHub;
    def.UpdateLink = "https://github.com/your-org/gw2logs-nexus";
    return &def;
}

BOOL APIENTRY DllMain(HMODULE, DWORD, LPVOID) { return TRUE; }
