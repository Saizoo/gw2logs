// Addon configuration, persisted as JSON next to the addon. Plain struct + two
// free functions; no threading concerns here — the caller owns synchronisation.
#pragma once

#include <Windows.h>
#include <shlobj.h>       // SHGetKnownFolderPath, FOLDERID_Documents
#include <string>
#include <fstream>
#include <cstdlib>
#include <nlohmann/json.hpp>

#pragma comment(lib, "shell32.lib")
#pragma comment(lib, "ole32.lib")

namespace gw2logs {

inline std::string NarrowUtf8(const wchar_t* w) {
    if (!w) return "";
    int n = WideCharToMultiByte(CP_UTF8, 0, w, -1, nullptr, 0, nullptr, nullptr);
    if (n <= 1) return "";
    std::string s(n - 1, 0);
    WideCharToMultiByte(CP_UTF8, 0, w, -1, s.data(), n, nullptr, nullptr);
    return s;
}

struct Settings {
    std::string serverUrl = "https://gw2logs.example.com/api"; // trailing /api, no slash
    std::string token;                                          // personal access token
    std::string logFolder;                                      // arcdps cbtlogs dir; empty => default
    bool        uploadEnabled = true;
    bool        uploadPrivate = false;
    std::string defaultGroupId;                                 // optional; attach uploads to a group
    bool        remindersEnabled = true;
    int         leadMinutes = 15;                               // alert this long before start

    // Default arcdps log location: <Documents>\Guild Wars 2\addons\arcdps\arcdps.cbtlogs.
    // Uses the real Documents known-folder (so OneDrive redirection is handled),
    // falling back to %USERPROFILE%\Documents only if that lookup fails.
    static std::string DefaultLogFolder() {
        std::string base;
        PWSTR docs = nullptr;
        if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_Documents, 0, nullptr, &docs))) {
            base = NarrowUtf8(docs);
        }
        if (docs) CoTaskMemFree(docs);
        if (base.empty()) {
            char* profile = nullptr;
            size_t len = 0;
            if (_dupenv_s(&profile, &len, "USERPROFILE") == 0 && profile) {
                base = std::string(profile) + "\\Documents";
                free(profile);
            }
        }
        if (base.empty()) return "";
        return base + "\\Guild Wars 2\\addons\\arcdps\\arcdps.cbtlogs";
    }

    std::string EffectiveLogFolder() const { return logFolder.empty() ? DefaultLogFolder() : logFolder; }
};

inline void to_json(nlohmann::json& j, const Settings& s) {
    j = nlohmann::json{
        {"serverUrl", s.serverUrl},        {"token", s.token},
        {"logFolder", s.logFolder},        {"uploadEnabled", s.uploadEnabled},
        {"uploadPrivate", s.uploadPrivate},{"defaultGroupId", s.defaultGroupId},
        {"remindersEnabled", s.remindersEnabled}, {"leadMinutes", s.leadMinutes},
    };
}

inline void from_json(const nlohmann::json& j, Settings& s) {
    // value(key, default) tolerates older/partial files.
    s.serverUrl = j.value("serverUrl", s.serverUrl);
    s.token = j.value("token", s.token);
    s.logFolder = j.value("logFolder", s.logFolder);
    s.uploadEnabled = j.value("uploadEnabled", s.uploadEnabled);
    s.uploadPrivate = j.value("uploadPrivate", s.uploadPrivate);
    s.defaultGroupId = j.value("defaultGroupId", s.defaultGroupId);
    s.remindersEnabled = j.value("remindersEnabled", s.remindersEnabled);
    s.leadMinutes = j.value("leadMinutes", s.leadMinutes);
}

inline Settings LoadSettings(const std::string& path) {
    Settings s;
    std::ifstream in(path);
    if (in) {
        try {
            nlohmann::json j;
            in >> j;
            s = j.get<Settings>();
        } catch (...) {
            // Corrupt/partial file → fall back to defaults rather than crash.
        }
    }
    return s;
}

inline void SaveSettings(const std::string& path, const Settings& s) {
    std::ofstream out(path, std::ios::trunc);
    if (out) out << nlohmann::json(s).dump(2);
}

} // namespace gw2logs
