# Ashen Reach
A mobile space campaign in Three.js. Serve dist/ over HTTP. Pilot three hulls, fly from orbit to the surface, and call a spirit into battle.

## Play The Choir Line

Board a hull, open **Bridge → The Choir Line** and trace the Nine Lanterns distress call. Mine ferrite on Aurelia, fit the repeater at Nacre, and bring a spirit into the Orison blockade. The final broadcast changes the price of a future cargo sale or the time it takes your spirit to answer.

For an agent-flown trip, open **Crew station → Command a landing** and choose a body. Astra takes the helm, operates the flight simulation, checkpoints the order and records the landing coordinates. Moving the stick gives the captain control.

Land on Aurelia and extract four ferrite to construct a field station from the bridge. Its building and beacon stay at the construction coordinates. Return within 65 metres for hull repairs or a cargo refit. Open the crew landing atlas to see saved touchdown locations.

The [game plan](GAME-PLAN.md) describes the setting, campaign and connected economy. The [development grid](DEVELOPMENT.md) links each workstream to a GitHub issue and a playtest.

## Runtime
space.mjs owns captain state, deck movement, combat, chart navigation, and local claims. space-view.mjs renders the simulation using WebGL or a projected canvas view. universe.mjs defines the shared deterministic frontier. A colony governor scores unmet district needs and specializes in housing, power, or industry. Each quarter-hour completes one project. Every eight cycles opens one world. The star chart reconstructs elapsed cycles without per-tick replay. Ships and claims persist in browser storage.

## Observatory
Run node server/observatory.mjs with PORT and STATE_DIR set for a persistent single-writer service. It advances independently of browsers and atomically publishes a frontier checkpoint. GET /api/frontier and GET /api/worlds/0 return the clock and governors. Static hosting computes the same simulation from its clock. The observatory is optional and is not an authoritative ownership server.

## Verification
Run node --test test/*.mjs. This release uses deterministic game AI. Shared player identity, competitive ownership arbitration, economy balancing, store packaging and device certification remain release work.

## Fleet graphics

Select a hull to inspect it, drag the hangar view to rotate it, then board. Each hull has its own silhouette. The frigate carries modular armor. The cutter has forward-swept vanes. The interceptor has a swept delta wing. All share fittings from the fleet's engineering kit.

Serve the packaged build with `python3 -m http.server 8000 --directory dist`. Open `http://localhost:8000`. Run `npm test` for mesh, lighting, and universe checks. No runtime package install is needed.

The WebGL renderer uses indexed meshes grouped by material, baked vertex occlusion, a roughness and bump texture, an environment reflection map, and a maximum initial drawing buffer of 1.9 million pixels. It lowers resolution when sustained frame times exceed 30 ms. The non-WebGL renderer uses Blender renders of the same hulls, a depth-tested walkable deck, and pre-lit planet discs. It loads additional hangar angles on demand. The game includes four planetary surface families.

## Rebuilding art

The game serves all visual assets locally. Regenerate surfaces with `python3 tools/bake-space.py` (NumPy, SciPy, Pillow). From the project root, run the following to rebuild the fleet assets with Blender and Pillow.

```sh
mkdir -p /tmp/reach-bake
node tools/export-models.mjs /tmp/reach-bake/models.json
blender -b -P tools/bake-occlusion.py -- /tmp/reach-bake/models.json "$PWD/dist/art"
blender -b -P tools/bake-views.py -- /tmp/reach-bake/models.json /tmp/reach-bake
python3 tools/encode-views.py /tmp/reach-bake dist/art
```

## Frontier release
Open **Bridge** after boarding. **Orbital navigation** integrates a two-body orbit with manoeuvring thrust. **Surface survey** places your ship in a local atmospheric flight region with gravity, drag and beacon scans. **Enter freeport** opens a district with carriers, customs ships, station contracts and refits. **Crew station** assigns Astra to fly a survey or returns control to the player. Crew identity and the latest 48 activity records are saved in this browser profile. These game agents run locally while playing. The campaign has separate navigation, atmospheric and combat modes.
