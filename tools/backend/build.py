#!/usr/bin/env python3
"""Build native Studio with an existing camera BSP/host dependency installation."""
import argparse
import os
from pathlib import Path
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--camera-root', type=Path, required=True)
    parser.add_argument('--target', choices=('host', 'arm'), default='host')
    parser.add_argument('--sanitize', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    camera = args.camera_root.resolve(strict=True)
    destination = root/'build'/('backend-'+args.target+('-sanitize' if args.sanitize else ''))
    env = os.environ.copy()
    flags = []
    if args.target == 'host':
        deps = camera/'.deps/host'
        env['PKG_CONFIG_LIBDIR'] = str(deps/'usr/lib/x86_64-linux-gnu/pkgconfig')
        env['PKG_CONFIG_SYSROOT_DIR'] = str(deps)
        flags = ['-DCMAKE_C_FLAGS=-I'+str(deps/'usr/include')+(' -fsanitize=address,undefined -fno-omit-frame-pointer' if args.sanitize else ''),
                 '-DCMAKE_EXE_LINKER_FLAGS=-Wl,-rpath,'+str(deps/'usr/lib/x86_64-linux-gnu')+(' -fsanitize=address,undefined' if args.sanitize else '')]
        cmake = 'cmake'
    else:
        if args.sanitize:
            parser.error('Sanitizer validation runs on host')
        env.update(VQEC_SYSROOT=str(camera/'.deps/sysroots/qrb5165'),
                   VQEC_C_COMPILER=str(camera/'.deps/cross/usr/bin/aarch64-linux-gnu-gcc-11'))
        env['PKG_CONFIG_SYSROOT_DIR'] = env['VQEC_SYSROOT']
        env['PKG_CONFIG_LIBDIR'] = ':'.join(str(Path(env['VQEC_SYSROOT'])/p) for p in
                                         ('usr/lib/aarch64-linux-gnu/pkgconfig', 'usr/lib/pkgconfig', 'usr/share/pkgconfig'))
        env['PATH'] = str(camera/'.deps/cross/usr/bin')+':'+env['PATH']
        flags = ['-DCMAKE_TOOLCHAIN_FILE='+str(camera/'cmake/toolchains/qrb5165.cmake')]
        cmake = str(camera/'.deps/host/usr/bin/cmake')
    env['LD_LIBRARY_PATH'] = ':'.join(str(camera/p) for p in
                                    ('.deps/cross/usr/lib/x86_64-linux-gnu', '.deps/host/usr/lib/x86_64-linux-gnu', '.deps/host/lib/x86_64-linux-gnu'))
    subprocess.run([cmake, '-S', str(root/'backend'), '-B', str(destination), '-DCMAKE_BUILD_TYPE=Debug', *flags], env=env, check=True)
    subprocess.run([cmake, '--build', str(destination), '--parallel', '4'], env=env, check=True)
    print(destination/'vqec-rule-studio-backend')


if __name__ == '__main__':
    main()
