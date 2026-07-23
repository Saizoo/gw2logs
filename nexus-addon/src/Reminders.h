// Polls GET /reminders for the user's group schedules and fires an in-game
// alert `leadMinutes` before each raid/fractal start. The server hands us the
// next start as an absolute UTC instant, so all we do here is compare to the
// system clock — no timezone logic.
#pragma once

#include <Windows.h>
#include <string>
#include <vector>
#include <unordered_set>
#include <functional>
#include <thread>
#include <atomic>
#include <ctime>
#include <cstdio>
#include <iterator>
#include <nlohmann/json.hpp>
#include "Settings.h"
#include "HttpClient.h"

namespace gw2logs {

class Reminders {
public:
    using SettingsProvider = std::function<Settings()>;
    using AlertFn = std::function<void(const std::string&)>;
    using LogFn = std::function<void(const std::string&)>;

    ~Reminders() { Stop(); }

    void Start(SettingsProvider getSettings, AlertFn alert, LogFn log) {
        Stop();
        getSettings_ = std::move(getSettings);
        alert_ = std::move(alert);
        log_ = std::move(log);
        stop_ = false;
        stopEvent_ = CreateEventW(nullptr, TRUE, FALSE, nullptr);
        worker_ = std::thread([this] { Run(); });
    }

    void Stop() {
        if (worker_.joinable()) {
            stop_ = true;
            if (stopEvent_) SetEvent(stopEvent_);
            worker_.join();
        }
        if (stopEvent_) { CloseHandle(stopEvent_); stopEvent_ = nullptr; }
    }

private:
    struct Occurrence {
        std::string key;   // groupId|kind|iso — dedupes alerts
        std::string label; // "Sunday Reclears raid"
        time_t startUtc = 0;
    };

    static bool ParseIsoUtc(const std::string& s, time_t& out) {
        int Y, M, D, h, m, sec = 0;
        if (sscanf_s(s.c_str(), "%d-%d-%dT%d:%d:%d", &Y, &M, &D, &h, &m, &sec) < 5) return false;
        std::tm tm{};
        tm.tm_year = Y - 1900; tm.tm_mon = M - 1; tm.tm_mday = D;
        tm.tm_hour = h; tm.tm_min = m; tm.tm_sec = sec;
        out = _mkgmtime(&tm); // interprets fields as UTC
        return out != (time_t)-1;
    }

    void Fetch(const Settings& s) {
        HttpResponse res = Get(s.serverUrl + "/reminders", s.token);
        if (!res.ok) {
            if (log_) log_("reminders fetch failed: " + (res.error.empty() ? ("HTTP " + std::to_string(res.status)) : res.error));
            return;
        }
        std::vector<Occurrence> next;
        try {
            auto j = nlohmann::json::parse(res.body);
            for (const auto& g : j.at("groups")) {
                std::string id = g.value("id", "");
                std::string name = g.value("name", "group");
                for (const char* kind : { "raid", "fractal" }) {
                    if (!g.contains(kind) || g.at(kind).is_null()) continue;
                    const auto& blk = g.at(kind);
                    if (!blk.contains("nextStartUtc") || blk.at("nextStartUtc").is_null()) continue;
                    std::string iso = blk.at("nextStartUtc").get<std::string>();
                    time_t t;
                    if (!ParseIsoUtc(iso, t)) continue;
                    Occurrence o;
                    o.key = id + "|" + kind + "|" + iso;
                    o.label = name + std::string(" ") + kind;
                    o.startUtc = t;
                    next.push_back(std::move(o));
                }
            }
            cache_ = std::move(next);
        } catch (const std::exception& e) {
            if (log_) log_(std::string("reminders parse error: ") + e.what());
        }
    }

    void Run() {
        time_t lastFetch = 0;
        const int TICK_MS = 20000;      // evaluate every 20s
        const int REFETCH_SECS = 300;   // re-pull schedules every 5 min

        while (!stop_) {
            Settings s = getSettings_ ? getSettings_() : Settings{};
            time_t now = time(nullptr);

            if (s.remindersEnabled && !s.token.empty() && !s.serverUrl.empty()) {
                if (now - lastFetch >= REFETCH_SECS) { Fetch(s); lastFetch = now; }

                for (const auto& o : cache_) {
                    time_t alertAt = o.startUtc - (time_t)s.leadMinutes * 60;
                    if (now >= alertAt && now < o.startUtc + 60 && !fired_.count(o.key)) {
                        long mins = (long)((o.startUtc - now + 59) / 60);
                        if (mins < 0) mins = 0;
                        if (alert_) alert_(o.label + " starts in " + std::to_string(mins) + " min");
                        fired_.insert(o.key);
                    }
                }
                // Forget occurrences well past their start so a token key can't
                // grow unbounded across a long session.
                for (auto it = fired_.begin(); it != fired_.end();) {
                    bool stale = true;
                    for (const auto& o : cache_) if (o.key == *it && now < o.startUtc + 3600) { stale = false; break; }
                    it = stale ? fired_.erase(it) : std::next(it);
                }
            }

            if (WaitForSingleObject(stopEvent_, TICK_MS) == WAIT_OBJECT_0) break;
        }
    }

    SettingsProvider getSettings_;
    AlertFn alert_;
    LogFn log_;
    std::vector<Occurrence> cache_;
    std::unordered_set<std::string> fired_;
    std::atomic<bool> stop_{false};
    HANDLE stopEvent_ = nullptr;
    std::thread worker_;
};

} // namespace gw2logs
