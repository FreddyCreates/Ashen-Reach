"""Compile the browser game into a single, offline HTML document.

ES modules retain native module isolation and semantics through an import map.
Only the four runtime asset lookups are adapted for embedded asset URLs.
"""
from base64 import b64encode
import json
from pathlib import Path
import re

MIME = {".webp": "image/webp", ".png": "image/png", ".ao": "application/octet-stream"}
IMPORT = re.compile(r"""(?P<prefix>\b(?:from\s*|import\s*))(?P<quote>['"])(?P<target>\./[^'"]+\.(?:mjs|js))(?P=quote)""")
ADAPT = {
    "freeroam.mjs": [("new URL('./art/world-'+s.worldId%4+'.webp',import.meta.url).href", "ashenAsset('./art/world-'+s.worldId%4+'.webp')"), ("new URL('./art/'+name+'.webp',import.meta.url)", "ashenAsset('./art/'+name+'.webp')")],
    "mesh-light.mjs": [("fetch('./art/'+key+'.ao')", "fetch(ashenAsset('./art/'+key+'.ao'))")],
    "software-view.mjs": [("new URL('./art/'+name+'.webp',import.meta.url)", "ashenAsset('./art/'+name+'.webp')")],
    "space-view.mjs": [("assets.load('./art/' + name + '.webp')", "assets.load(ashenAsset('./art/'+name+'.webp'))")],
    "orbital-flight.mjs": [("im.src='./art/disc-'+family+'.webp'", "im.src=ashenAsset('./art/disc-'+family+'.webp')")],
}


def data_url(mime, data):
    return "data:" + mime + ";base64," + b64encode(data).decode("ascii")


def compile_page(dist):
    assets = {"./" + file.relative_to(dist).as_posix(): data_url(MIME[file.suffix], file.read_bytes())
              for file in sorted((dist / "art").rglob("*")) if file.is_file() and file.suffix in MIME}
    imports = {}
    pending = ["space.mjs"]
    while pending:
        name = pending.pop()
        if name in imports:
            continue
        source = (dist / name).read_text(encoding="utf-8")
        def resolve(match):
            full = (dist / Path(name).parent / match["target"]).resolve().relative_to(dist.resolve()).as_posix()
            pending.append(full)
            return match["prefix"] + json.dumps("ashen-local/" + full)
        source = IMPORT.sub(resolve, source)
        for old, new in ADAPT.get(name, []):
            if source.count(old) != 1:
                raise ValueError(f"Asset lookup changed in {name}. Update the portable build for {old!r}.")
            source = source.replace(old, new)
        if name in ADAPT:
            source = "const ashenAsset = globalThis.ashenLocalAsset;\n" + source
        imports[name] = data_url("text/javascript", source.encode("utf-8"))
    index = (dist / "index.html").read_text(encoding="utf-8")
    index = re.sub(r'<link rel="manifest"[^>]*>', '', index)
    index = index.replace('./icon-192.png', data_url("image/png", (dist / "icon-192.png").read_bytes()))
    index = re.sub(r'<link rel="stylesheet" href="\./([^"]+)">', lambda m: '<style>' + (dist / m[1]).read_text() + '</style>', index)
    tags = ('<script>globalThis.ashenLocalAsset = (() => { const assets = ' + json.dumps(assets, separators=(',', ':')) +
            '; return path => { if (!assets[path]) throw Error("Missing local asset " + path); return assets[path]; }; })();</script>\n' +
            '<script type="importmap">' + json.dumps({"imports": {"ashen-local/" + n: v for n, v in imports.items()}}, separators=(',', ':')) +
            '</script>\n<script type="module">import "ashen-local/space.mjs";</script>')
    entry = '<script type="module" src="./space.mjs"></script>'
    if index.count(entry) != 1:
        raise ValueError("Unrecognized game entry module")
    return index.replace(entry, tags)
