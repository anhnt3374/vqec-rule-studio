#!/usr/bin/env python3
"""Install a verified static release under its own application prefix."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tarfile
import sqlite3
import shutil
g_database = Path('/var/lib/vqec-rule-studio/attendance.sqlite3')


def backup_configuration(snapshot):
    database = g_database
    if database.exists():
        with sqlite3.connect('file:'+str(database)+'?mode=ro', uri=True) as source:
            with sqlite3.connect(str(snapshot/'attendance.sqlite3')) as target:
                source.backup(target)
        (snapshot/'attendance.sqlite3').chmod(0o600)


def restore_configuration(snapshot):
    backup = snapshot/'attendance.sqlite3'
    if backup.exists():
        database = g_database
        for suffix in ('-wal', '-shm'):
            Path(str(database)+suffix).unlink(missing_ok=True)
        shutil.copy2(backup, database)  # Both owned services have stopped first.


def activate(root, release):
    units = {
        'vqec-rule-studio.service': 'VQEC standalone Rule Studio',
        'vqec-rule-studio-backend.service': 'VQEC Rule Studio native analysis',
    }
    saved = {}
    for name, owner in units.items():
        path = Path('/etc/systemd/system')/name
        if path.exists() and (path.is_symlink() or owner not in path.read_text()):
            raise RuntimeError('Unit is owned by another application')
        saved[name] = path.read_bytes() if path.exists() else None
    old = (root/'current').resolve(strict=True) if (root/'current').is_symlink() else None
    snapshot = root/'rollbacks'/release.name
    snapshot.mkdir(parents=True, mode=0o700)
    backup_configuration(snapshot)
    (snapshot/'previous.json').write_text(json.dumps({'release': str(old) if old else None}))
    for name, data in saved.items():
        if data is not None:
            (snapshot/name).write_bytes(data)
    (release/'bin/vqec-rule-studio-backend').chmod(0o755)
    try:
        pending = root/'pending'
        pending.symlink_to(release)
        pending.replace(root/'current')
        for name in units:
            (Path('/etc/systemd/system')/name).write_bytes((release/'tools'/name).read_bytes())
        subprocess.run(['systemctl', 'daemon-reload'], check=True)
        subprocess.run(['systemctl', 'enable', *units], check=True)
        for name in reversed(units):
            subprocess.run(['systemctl', 'restart', name], check=True)
            subprocess.run(['systemctl', 'is-active', '--quiet', name], check=True)
    except BaseException:
        subprocess.run(['systemctl', 'stop', *units], check=True)
        restore_configuration(snapshot)
        if old:
            restore = root/'restore'
            restore.symlink_to(old)
            restore.replace(root/'current')
        for name, data in saved.items():
            path = Path('/etc/systemd/system')/name
            if data is None:
                subprocess.run(['systemctl', 'disable', name], check=False)
                path.unlink(missing_ok=True)
            else:
                path.write_bytes(data)
        subprocess.run(['systemctl', 'daemon-reload'], check=True)
        for name, data in reversed(list(saved.items())):
            if data is not None:
                subprocess.run(['systemctl', 'start', name], check=True)
        raise


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
    activate(root, release)
    print('Rule Studio installed at https://192.168.138.142:8444/ (' + version + ')')


if __name__ == '__main__':
    main()
