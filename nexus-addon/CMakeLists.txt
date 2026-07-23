cmake_minimum_required(VERSION 3.21)
project(gw2logs_nexus LANGUAGES CXX)

# Builds gw2logs.dll — a Nexus addon. Windows/MSVC only.
#
# This CMake path expects the Nexus + ImGui SDK headers as git submodules under
# src/ (the same layout as Raidcore's official template):
#   src/nexus/Nexus.h     from https://github.com/RaidcoreGG/RCGG-lib-nexus-api
#   src/imgui/imgui.h     from https://github.com/RaidcoreGG/imgui
#   src/mumble/Mumble.h   from https://github.com/RaidcoreGG/RCGG-lib-mumble-api (optional)
# and nlohmann/json's single header at include/nlohmann/json.hpp.
#
# Beginners: see GETTING_STARTED.md — building from Raidcore's template .sln in
# Visual Studio is the recommended first-time path; this CMake file is the
# alternative once the submodules are in place.

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if (NOT WIN32)
  message(FATAL_ERROR "The gw2logs Nexus addon builds on Windows (MSVC) only.")
endif()

file(GLOB IMGUI_SOURCES "${CMAKE_SOURCE_DIR}/src/imgui/*.cpp")

add_library(gw2logs SHARED
  src/Addon.cpp
  ${IMGUI_SOURCES}      # compile the ImGui submodule sources in
)

target_include_directories(gw2logs PRIVATE
  ${CMAKE_SOURCE_DIR}/src        # resolves "nexus/Nexus.h", "imgui/imgui.h", our *.h
  ${CMAKE_SOURCE_DIR}/include    # resolves <nlohmann/json.hpp>
)

# WinHTTP for the HTTP client; no other third-party libs to link.
target_link_libraries(gw2logs PRIVATE winhttp)

set_target_properties(gw2logs PROPERTIES
  OUTPUT_NAME "gw2logs"
  PREFIX ""            # -> gw2logs.dll, not libgw2logs.dll
)

if (MSVC)
  target_compile_options(gw2logs PRIVATE /W3 /EHsc)
  target_compile_definitions(gw2logs PRIVATE _CRT_SECURE_NO_WARNINGS NOMINMAX WIN32_LEAN_AND_MEAN)
endif()
