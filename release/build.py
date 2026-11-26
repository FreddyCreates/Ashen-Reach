"""Build the portable game and a deterministic deployable source archive."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

from portable import compile_page

ROOT = Path(__file__).resolve().parents[1]
INCLUDE = ["dist", "server", "tools", "test", "release", ".github", ".gitignore", "package.json", "README.md", "INSTALL.md", "GAME-PLAN.md", "DEVELOPMENT.md"]


def build(output):
    version = json.loads((ROOT / "package.json").read_text())["version"]
    output.mkdir(parents=True, exist_ok=True)
    portable = output / "Play Ashen Reach.html"
    portable.write_text(compile_page(ROOT / "dist"), encoding="utf-8")
    files = []
    for name in INCLUDE:
        path = ROOT / name
        if not path.exists():
            raise FileNotFoundError(path)
        for candidate in (path.rglob("*") if path.is_dir() else [path]):
            if candidate.is_file() and not candidate.is_symlink() and "__pycache__" not in candidate.parts and candidate.suffix != ".pyc":
                files.append((candidate.relative_to(ROOT).as_posix(), candidate))
    files.append((portable.name, portable))
    archive = output / f"AshenReach-{version}.zip"
    checks = []
    with ZipFile(archive, "w") as stream:
        def append(name, data):
            entry = ZipInfo("AshenReach/" + name, date_time=(2026, 1, 1, 0, 0, 0))
            entry.compress_type = ZIP_DEFLATED
            entry.external_attr = 0o100644 << 16
            stream.writestr(entry, data)
        for name, path in sorted(files):
            data = path.read_bytes()
            checks.append(hashlib.sha256(data).hexdigest() + "  " + name)
            append(name, data)
        append("SHA256SUMS.txt", ("\n".join(checks) + "\n").encode())
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (output / (archive.name + ".sha256")).write_text(digest + "  " + archive.name + "\n")
    print(f"{archive}\n{digest}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "release-output")
    build(parser.parse_args().output)
