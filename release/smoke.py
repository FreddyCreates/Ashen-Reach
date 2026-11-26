"""Verify all archive members and run the simulation suite from the extracted game."""
import hashlib, subprocess, sys, tempfile, zipfile
from pathlib import Path
with tempfile.TemporaryDirectory() as tmp, zipfile.ZipFile(sys.argv[1]) as archive:
    archive.extractall(tmp)
    root=Path(tmp)/'AshenReach'
    for line in (root/'SHA256SUMS.txt').read_text().splitlines():
        digest,name=line.split('  ',1)
        assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest, name
    page=(root/'Play Ashen Reach.html').read_text()
    assert 'type="importmap"' in page and 'ashen-local/space.mjs' in page
    subprocess.run(['node','--test'],cwd=root,check=True)
