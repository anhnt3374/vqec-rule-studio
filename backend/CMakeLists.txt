cmake_minimum_required(VERSION 3.16)
project(vqec_studio_backend LANGUAGES C)
set(CMAKE_C_STANDARD 17)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS OFF)
find_package(Threads REQUIRED)
find_package(PkgConfig REQUIRED)
pkg_check_modules(STUDIO REQUIRED IMPORTED_TARGET json-c sqlite3)
add_executable(vqec-rule-studio-backend
    engine/context.c engine/geometry.c engine/process.c
    highlight/config.c highlight/state.c ipc/reply.c
    service/main.c service/state.c service/socket.c service/config.c service/status.c
    service/analysis.c service/control.c)
target_compile_options(vqec-rule-studio-backend PRIVATE -Wall -Wextra -Werror -Wpedantic)
target_link_libraries(vqec-rule-studio-backend PRIVATE Threads::Threads PkgConfig::STUDIO m)
