cmake_minimum_required(VERSION 3.21)
project(gw2logs_nexus LANGUAGES CXX)

# Builds gw2logs.dll — a Nexus addon. Windows/MSVC only.

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if (NOT WIN32)
  message(FATAL_ERROR "The gw2logs Nexus addon builds on Windows (MSVC) only.")
endif()

# --- external headers -------------------------------------------------------
# Point these at your local copies:
#   NEXUS_SDK_DIR : the official Nexus SDK (provides the real Nexus.h + ImGui)
#   IMGUI_DIR     : Dear ImGui headers matching the version Nexus ships
#   JSON_DIR      : nlohmann/json single-header root (contains nlohmann/json.hpp)
set(NEXUS_SDK_DIR "" CACHE PATH "Path to the Nexus SDK headers")
set(IMGUI_DIR     "" CACHE PATH "Path to Dear ImGui headers")
set(JSON_DIR      "${CMAKE_SOURCE_DIR}/include" CACHE PATH "Root containing nlohmann/json.hpp")

add_library(gw2logs SHARED
  src/Addon.cpp
)

target_include_directories(gw2logs PRIVATE
  ${CMAKE_SOURCE_DIR}/include   # trimmed Nexus.h scaffold (replace with NEXUS_SDK_DIR)
  ${CMAKE_SOURCE_DIR}/src
  ${NEXUS_SDK_DIR}
  ${IMGUI_DIR}
  ${JSON_DIR}
)

# WinHTTP for the HTTP client; no other third-party libs.
target_link_libraries(gw2logs PRIVATE winhttp)

set_target_properties(gw2logs PROPERTIES
  OUTPUT_NAME "gw2logs"
  PREFIX ""            # -> gw2logs.dll, not libgw2logs.dll
)

if (MSVC)
  target_compile_options(gw2logs PRIVATE /W3 /EHsc)
  target_compile_definitions(gw2logs PRIVATE _CRT_SECURE_NO_WARNINGS NOMINMAX WIN32_LEAN_AND_MEAN)
endif()
