# Play Ashen Reach locally

1. Extract the complete ZIP into a permanent folder such as Games/AshenReach.
2. Double-click **Play Ashen Reach.html** at the top of the extracted folder. It opens directly in a modern desktop browser on Windows, macOS, or Linux. All game modules, textures, and ship models are included. Hardware acceleration enables the WebGL renderer.
3. Select a hull, board your ship, and visit the bridge to choose a destination.

The standalone edition needs a browser with native JavaScript module and import-map support. Use a regular browser window for persistent progress. Local-file storage behavior varies by browser. Keep the file in the same location and browser profile. Clearing browser data removes this device's save.

## Local web-app mode

For a stable origin with browser-managed saves, use Node.js 20 or later. In the extracted folder run:

```sh
npm start
```

Open **http://127.0.0.1:4178/** and leave the terminal running. Close it or press Ctrl+C to stop. This launch path needs no downloaded npm dependencies. The offline file and localhost URL have separate saves.

With Python 3 installed, `python3 -m http.server 4178 --bind 127.0.0.1 --directory dist` also serves the game from the same origin. On Windows use `py -3` in place of `python3`.

## Hosting and development

Upload the contents of `dist/` to a static HTTPS host, retaining names and directories. The hosted browser UI accesses assets using relative paths. For GitHub Pages, enable **Settings → Pages → Source → GitHub Actions**, then manually run the optional **Deploy game to Pages** workflow. Only run that workflow when you are ready to publish.

Run `npm test` for simulation and mesh checks. To produce a fresh standalone file and source ZIP, run `python3 release/build.py` (Windows: `py -3 release/build.py`). Output goes in `release-output/`. Run `python3 release/smoke.py release-output/AshenReach-0.7.0.zip` to extract, inspect, and exercise the release. Node.js 20+ and Python 3.9+ are used by these development checks.

The package includes an optional, separate observatory service in `server/observatory.mjs`. The playable campaign runs independently and stores its player records in the browser. See README.md for engine and art-pipeline details.

### Continuous flight in 0.6

Board a ship and open Bridge → Free flight, or walk to the helm. Hold the stick forward or W to approach the selected world. The ship levels out near terrain and enters surface drive at three metres of clearance. Keep moving to cross the ground. Climb lifts away. Bearing selects another planet in the same four-body system. Manual steering releases the approach guidance. Turn with A/D, pitch with I/K and lift with U/J. Cruise assist compresses travel time. Toggle Newtonian to coast with gravity and apply thrust directly. Switching drives retains velocity.

## First session in 0.7

After boarding, open **Bridge → The Choir Line** to start the convoy story. For an assisted flight, use **Crew station → Command a landing**. Astra records completed approaches in the Landing atlas. On Aurelia, collect four ferrite below 30 metres. At a clearance of five metres or less, open **Bridge → Field station** to build a service station, or keep the ore for the Nacre repeater. Construction and the repeater each consume four ferrite.

To reach the first geographic freeport, open **Bridge → Planetary port → Approach Morrow berth** while at Aurelia. Hold the movement stick forward. Settle below 12 metres and 35 m/s inside the 90 metre berth envelope, then use **Port → Dock at Morrow Works**.
