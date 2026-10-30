#!/usr/bin/env python3
"""Install a verified static release under its own application prefix."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tarfile


def main():
    archive = Path(sys.argv[1])
    root = Path('/opt/vqec-rule-studio')
    with tarfile.open(archive) as bundle:
        members = bundle.getmembers()
        if len(members) > 100 or sum(m.size for m in members) > 16 * 1024 * 1024:
            raise RuntimeError('Invalid archive size')
        names = [m.name for m in members]
        if len(names) != len(set(names)) or any(not m.isfile() or m.name.startswith('/') or '..' in Path(m.name).parts for m in members):
            raise RuntimeError('Unsafe archive paths')
        manifest = json.load(bundle.extractfile('manifest.json'))
        version = manifest['version']
        if not re.fullmatch(r'studio\.[a-f0-9]{12}', version):
            raise RuntimeError('Invalid version')
        if set(names) != set(manifest['files']) | {'manifest.json'}:
            raise RuntimeError('Invalid inventory')
        release = root / 'releases' / version
        if release.exists():
            raise RuntimeError('Release already exists; use a new content version')
        release.mkdir(parents=True)
        bundle.extractall(str(release))
    for name, digest in manifest['files'].items():
        path = release / name
        if path.is_symlink() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise RuntimeError('Release hash mismatch')
    pending = root / 'pending'
    pending.symlink_to(release)
    pending.replace(root / 'current')
    unit = Path('/etc/systemd/system/vqec-rule-studio.service')
    if unit.exists() and 'VQEC standalone Rule Studio' not in unit.read_text():
        raise RuntimeError('Unit is owned by another application')
    unit.write_bytes((release / 'tools/vqec-rule-studio.service').read_bytes())
    subprocess.run(['systemctl', 'daemon-reload'], check=True)
    subprocess.run(['systemctl', 'enable', 'vqec-rule-studio.service'], check=True)
    subprocess.run(['systemctl', 'restart', 'vqec-rule-studio.service'], check=True)
    print('Rule Studio installed at https://192.168.138.142:8444/ (' + version + ')')


if __name__ == '__main__':
    main()
