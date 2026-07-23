// Minimal WinHTTP client — dependency-free (WinHTTP ships with Windows). Just
// the two shapes this addon needs: an authenticated GET returning a body, and a
// multipart/form-data POST of a single file plus a few text fields.
#pragma once

#include <Windows.h>
#include <winhttp.h>
#include <string>
#include <vector>
#include <fstream>

#pragma comment(lib, "winhttp.lib")

namespace gw2logs {

struct HttpResponse {
    bool ok = false;      // transport succeeded AND status is 2xx
    long status = 0;
    std::string body;
    std::string error;    // populated on transport failure
};

struct ParsedUrl {
    bool https = true;
    std::wstring host;
    INTERNET_PORT port = 443;
    std::wstring path; // includes leading '/'
    bool valid = false;
};

inline std::wstring Widen(const std::string& s) {
    if (s.empty()) return L"";
    int n = MultiByteToWideChar(CP_UTF8, 0, s.c_str(), (int)s.size(), nullptr, 0);
    std::wstring w(n, 0);
    MultiByteToWideChar(CP_UTF8, 0, s.c_str(), (int)s.size(), w.data(), n);
    return w;
}

inline ParsedUrl ParseUrl(const std::string& url) {
    ParsedUrl p;
    std::wstring w = Widen(url);
    URL_COMPONENTS uc{};
    uc.dwStructSize = sizeof(uc);
    wchar_t host[256]{};
    wchar_t path[2048]{};
    uc.lpszHostName = host; uc.dwHostNameLength = _countof(host);
    uc.lpszUrlPath = path; uc.dwUrlPathLength = _countof(path);
    if (!WinHttpCrackUrl(w.c_str(), (DWORD)w.size(), 0, &uc)) return p;
    p.https = (uc.nScheme == INTERNET_SCHEME_HTTPS);
    p.host = host;
    p.port = uc.nPort;
    p.path = path[0] ? path : L"/";
    p.valid = true;
    return p;
}

// Shared request core. `extraHeaders` is a single CRLF-joined header block (may
// be empty). `body`/`contentType` drive a POST; empty body => GET.
inline HttpResponse Request(const std::string& url,
                            const std::string& bearer,
                            const std::string& method,
                            const std::string& body,
                            const std::string& contentType) {
    HttpResponse r;
    ParsedUrl u = ParseUrl(url);
    if (!u.valid) { r.error = "bad URL"; return r; }

    HINTERNET session = WinHttpOpen(L"gw2logs-nexus/1.0",
                                    WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY,
                                    WINHTTP_NO_PROXY_NAME, WINHTTP_NO_PROXY_BYPASS, 0);
    if (!session) { r.error = "WinHttpOpen failed"; return r; }

    HINTERNET connect = WinHttpConnect(session, u.host.c_str(), u.port, 0);
    if (!connect) { r.error = "WinHttpConnect failed"; WinHttpCloseHandle(session); return r; }

    DWORD flags = u.https ? WINHTTP_FLAG_SECURE : 0;
    HINTERNET request = WinHttpOpenRequest(connect, Widen(method).c_str(), u.path.c_str(),
                                           nullptr, WINHTTP_NO_REFERER,
                                           WINHTTP_DEFAULT_ACCEPT_TYPES, flags);
    if (!request) { r.error = "WinHttpOpenRequest failed"; WinHttpCloseHandle(connect); WinHttpCloseHandle(session); return r; }

    std::wstring headers;
    if (!bearer.empty()) headers += L"Authorization: Bearer " + Widen(bearer) + L"\r\n";
    if (!contentType.empty()) headers += L"Content-Type: " + Widen(contentType) + L"\r\n";

    BOOL sent = WinHttpSendRequest(request,
                                   headers.empty() ? WINHTTP_NO_ADDITIONAL_HEADERS : headers.c_str(),
                                   headers.empty() ? 0 : (DWORD)-1L,
                                   body.empty() ? WINHTTP_NO_REQUEST_DATA : (LPVOID)body.data(),
                                   (DWORD)body.size(), (DWORD)body.size(), 0);
    if (sent) sent = WinHttpReceiveResponse(request, nullptr);
    if (!sent) {
        r.error = "request failed (" + std::to_string(GetLastError()) + ")";
        WinHttpCloseHandle(request); WinHttpCloseHandle(connect); WinHttpCloseHandle(session);
        return r;
    }

    DWORD statusCode = 0, size = sizeof(statusCode);
    WinHttpQueryHeaders(request, WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
                        WINHTTP_HEADER_NAME_BY_INDEX, &statusCode, &size, WINHTTP_NO_HEADER_INDEX);
    r.status = (long)statusCode;

    DWORD avail = 0;
    do {
        avail = 0;
        if (!WinHttpQueryDataAvailable(request, &avail) || avail == 0) break;
        std::vector<char> buf(avail);
        DWORD read = 0;
        if (WinHttpReadData(request, buf.data(), avail, &read) && read > 0)
            r.body.append(buf.data(), read);
    } while (avail > 0);

    r.ok = (r.status >= 200 && r.status < 300);
    WinHttpCloseHandle(request);
    WinHttpCloseHandle(connect);
    WinHttpCloseHandle(session);
    return r;
}

inline HttpResponse Get(const std::string& url, const std::string& bearer) {
    return Request(url, bearer, "GET", "", "");
}

struct MultipartField { std::string name; std::string value; };

// POST a file (bytes read from disk) plus optional text fields as
// multipart/form-data. `fileFieldName` is the form field the server reads
// (gw2logs uses "file").
inline HttpResponse PostMultipartFile(const std::string& url,
                                      const std::string& bearer,
                                      const std::string& filePath,
                                      const std::string& fileFieldName,
                                      const std::string& fileName,
                                      const std::vector<MultipartField>& fields) {
    std::ifstream in(filePath, std::ios::binary);
    if (!in) { HttpResponse r; r.error = "cannot open file"; return r; }
    std::string fileBytes((std::istreambuf_iterator<char>(in)), std::istreambuf_iterator<char>());

    const std::string boundary = "----gw2logsNexusBoundary7MA4YWxkTrZu0gW";
    std::string body;
    for (const auto& f : fields) {
        body += "--" + boundary + "\r\n";
        body += "Content-Disposition: form-data; name=\"" + f.name + "\"\r\n\r\n";
        body += f.value + "\r\n";
    }
    body += "--" + boundary + "\r\n";
    body += "Content-Disposition: form-data; name=\"" + fileFieldName + "\"; filename=\"" + fileName + "\"\r\n";
    body += "Content-Type: application/octet-stream\r\n\r\n";
    body += fileBytes;
    body += "\r\n--" + boundary + "--\r\n";

    return Request(url, bearer, "POST", body, "multipart/form-data; boundary=" + boundary);
}

} // namespace gw2logs
