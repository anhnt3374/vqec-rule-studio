#!/usr/bin/env python3
"""Build on the host and deploy static assets; no npm/Node is needed on board."""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile


def main():
    root = Path(__file__).resolve().parents[2]
    subprocess.run(['npm', 'run', 'build'], cwd=root, check=True)
    files = {'dist/' + str(f.relative_to(root / 'dist')): f for f in (root / 'dist').rglob('*') if f.is_file()}
    files.update({'tools/' + name: root / 'tools/board' / name for name in ('serve.py', 'vqec-rule-studio.service')})
    digests = {name: hashlib.sha256(path.read_bytes()).hexdigest() for name, path in sorted(files.items())}
    version = 'studio.' + hashlib.sha256(json.dumps(digests, sort_keys=True).encode()).hexdigest()[:12]
    manifest = json.dumps({'version': version, 'files': digests}, sort_keys=True, indent=2).encode()
    target = 'root@192.168.138.142'
    with tempfile.TemporaryDirectory(prefix='vqec-studio-') as directory:
        archive = Path(directory) / (version + '.tar.gz')
        with tarfile.open(archive, 'w:gz') as bundle:
            for name, path in files.items():
                bundle.add(path, arcname=name)
            entry = tarfile.TarInfo('manifest.json')
            entry.size = len(manifest)
            bundle.addfile(entry, io.BytesIO(manifest))
        remote = '/tmp/' + archive.name
        subprocess.run(['scp', '-q', str(archive), target + ':' + remote], check=True)
        try:
            script = (root / 'tools/board/install.py').read_bytes()
            subprocess.run(['ssh', '-o', 'BatchMode=yes', target, 'python3 - ' + remote], input=script, check=True)
        finally:
            subprocess.run(['ssh', '-o', 'BatchMode=yes', target, 'rm -f ' + remote], check=True)


if __name__ == '__main__':
    main()
