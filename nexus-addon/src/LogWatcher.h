// Watches the arcdps cbtlogs folder (recursively — arc writes into per-boss
// subfolders) for new .zevtc files and invokes a callback once each file has
// finished being written. Overlapped ReadDirectoryChangesW so the same thread
// can also poll pending files for size-stability between directory events.
#pragma once

#include <Windows.h>
#include <string>
#include <vector>
#include <functional>
#include <thread>
#include <atomic>
#include <unordered_map>

namespace gw2logs {

class LogWatcher {
public:
    using Callback = std::function<void(const std::string& fullPath)>;

    LogWatcher() = default;
    ~LogWatcher() { Stop(); }

    void Start(const std::string& folder, Callback onNewLog) {
        Stop();
        folder_ = folder;
        cb_ = std::move(onNewLog);
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
    static bool EndsWithZevtc(const std::wstring& name) {
        static const std::wstring ext = L".zevtc";
        if (name.size() < ext.size()) return false;
        std::wstring tail = name.substr(name.size() - ext.size());
        for (auto& c : tail) c = (wchar_t)towlower(c);
        return tail == ext;
    }

    static std::string Narrow(const std::wstring& w) {
        if (w.empty()) return "";
        int n = WideCharToMultiByte(CP_UTF8, 0, w.c_str(), (int)w.size(), nullptr, 0, nullptr, nullptr);
        std::string s(n, 0);
        WideCharToMultiByte(CP_UTF8, 0, w.c_str(), (int)w.size(), s.data(), n, nullptr, nullptr);
        return s;
    }

    void Run() {
        std::wstring wfolder(folder_.begin(), folder_.end());
        HANDLE dir = CreateFileW(wfolder.c_str(), FILE_LIST_DIRECTORY,
                                 FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                                 nullptr, OPEN_EXISTING,
                                 FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OVERLAPPED, nullptr);
        if (dir == INVALID_HANDLE_VALUE) return;

        OVERLAPPED ov{};
        ov.hEvent = CreateEventW(nullptr, TRUE, FALSE, nullptr);
        std::vector<BYTE> buffer(64 * 1024);

        auto queueRead = [&]() -> bool {
            ResetEvent(ov.hEvent);
            return ReadDirectoryChangesW(dir, buffer.data(), (DWORD)buffer.size(), TRUE,
                                         FILE_NOTIFY_CHANGE_FILE_NAME | FILE_NOTIFY_CHANGE_SIZE |
                                         FILE_NOTIFY_CHANGE_LAST_WRITE,
                                         nullptr, &ov, nullptr) != 0;
        };
        queueRead();

        // path -> (lastSeenSize, stableTicks). A file uploads once its size has
        // held steady for a couple of poll cycles (~1s), so we don't grab a
        // half-written log.
        std::unordered_map<std::wstring, std::pair<unsigned long long, int>> pending;

        HANDLE waits[2] = { ov.hEvent, stopEvent_ };
        while (!stop_) {
            DWORD w = WaitForMultipleObjects(2, waits, FALSE, 500 /*ms poll*/);
            if (stop_) break;

            if (w == WAIT_OBJECT_0) {
                DWORD bytes = 0;
                if (GetOverlappedResult(dir, &ov, &bytes, FALSE) && bytes > 0) {
                    BYTE* p = buffer.data();
                    for (;;) {
                        auto* info = reinterpret_cast<FILE_NOTIFY_INFORMATION*>(p);
                        if (info->Action == FILE_ACTION_ADDED ||
                            info->Action == FILE_ACTION_MODIFIED ||
                            info->Action == FILE_ACTION_RENAMED_NEW_NAME) {
                            std::wstring name(info->FileName, info->FileNameLength / sizeof(WCHAR));
                            if (EndsWithZevtc(name)) {
                                std::wstring full = wfolder + L"\\" + name;
                                pending.try_emplace(full, 0ull, 0);
                            }
                        }
                        if (info->NextEntryOffset == 0) break;
                        p += info->NextEntryOffset;
                    }
                }
                queueRead();
            }

            // Size-stability sweep for pending files.
            for (auto it = pending.begin(); it != pending.end();) {
                WIN32_FILE_ATTRIBUTE_DATA fad{};
                if (GetFileAttributesExW(it->first.c_str(), GetFileExInfoStandard, &fad)) {
                    unsigned long long size =
                        ((unsigned long long)fad.nFileSizeHigh << 32) | fad.nFileSizeLow;
                    if (size > 0 && size == it->second.first) {
                        if (++it->second.second >= 2) { // stable across two sweeps
                            if (cb_) cb_(Narrow(it->first));
                            it = pending.erase(it);
                            continue;
                        }
                    } else {
                        it->second.first = size;
                        it->second.second = 0;
                    }
                }
                ++it;
            }
        }

        CancelIo(dir);
        CloseHandle(ov.hEvent);
        CloseHandle(dir);
    }

    std::string folder_;
    Callback cb_;
    std::atomic<bool> stop_{false};
    HANDLE stopEvent_ = nullptr;
    std::thread worker_;
};

} // namespace gw2logs
