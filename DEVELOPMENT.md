# Development grid

The next playable milestone is a captain landing at a named berth, watching a carrier unload and selling locally mined cargo. Development agents work from the linked GitHub issues. The issue and its linked PR hold the current status.

| Workstream | Task | Dependency | Acceptance |
| --- | --- | --- | --- |
| World & flight | [Anchor the first freeport to a planetary coordinate](https://github.com/FreddyCreates/Ashen-Reach/issues/1) | None | Add a named berth on the ferric world. Navigate to its marker from orbit, land inside the berth envelope, leave and return to that same coordinate. Verify reload and touch controls. |
| Economy | [Carry one cargo manifest from ship to market](https://github.com/FreddyCreates/Ashen-Reach/issues/2) | First geographic berth | Deliver harvested ore at the berth. Credit the fleet wallet exactly once across retries and reloads. Both the hold and the receiving station must reflect the transfer. |
| Crew & simulation | [Give one independent carrier a persistent route](https://github.com/FreddyCreates/Ashen-Reach/issues/3) | First geographic berth | One named NPC owns a hull, claims a berth, loads actual station stock, flies and unloads. Save mid-leg and resume with the same identity, manifest and destination. Bound offline catch-up. |
| Narrative & spirits | [Make the campaign ending change the next contract](https://github.com/FreddyCreates/Ashen-Reach/issues/4) | Playable opening chapter | Offer a follow-up job determined by the player's first chapter resolution. Give each outcome a distinct material cost and a visible change in a named port. Test both branches and old saves. |
| Real play & release | [Playtest a complete freight run on mobile](https://github.com/FreddyCreates/Ashen-Reach/issues/5) | Berth and cargo transfer | Record device/browser, frame-time percentiles, input issues, touch layout, and a reproducible takeoff-to-sale run. Record desktop or emulated results separately from physical hardware. |
| Embodiment & memory | [Transfer a crew passport between two local saves](https://github.com/FreddyCreates/Ashen-Reach/issues/6) | Persistent crew orders | Version a portable identity and memory format. Import with conflict handling. Verify stable identity, sequence continuity and bounded memory. Demonstrate offline recovery before claiming device federation. |

## One development cycle

1. Read the game plan and current main branch. Inspect open issues and PRs for an existing implementation. Pick the earliest ready issue. A dependency is ready when its acceptance test works on main.
2. Use a branch named `build/issue-N`. A worker finding that branch should resume the existing work or select an independent issue. Put the issue number in the PR body.
3. Implement a complete player path, including entry from the bridge or helm, persistence and recovery. Keep the simulation independently testable.
4. Run `npm test`, `python3 release/build.py` and the release smoke check for the generated ZIP. Exercise the path through the user interface. Record the device, browser, inputs, observed outcome, commit, and anything still unverified.
5. Open or update the PR and link the evidence. Use the GitHub verification workflow to catch packaging regressions. Resolve review feedback on the same branch. Close the issue when its acceptance criteria are demonstrated on the merged build.

## In-world agents

A playtest agent and an in-world pilot have different jobs. A playtest agent records an observed trip from the user interface. Astra operates on the current flight simulation with game commands, local resources and persistent crew memory. Only accepted simulator events can change possessions, occupancy, mission rewards or ownership.

## Review of the proposed device and memory architecture

| Proposal | Game integration and proof required |
| --- | --- |
| Identity and spatial memory | Keep one crew ID across assignments. Save vessel, order, frame of reference, position, velocity and recent events. Restore mid-trip and verify a single arrival. |
| MEDINA 5D memory | Prototype a versioned adapter for longitude, latitude, radial distance, narrative or relational ring, and simulation beat. Preserve Cartesian coordinates for physics. Compare recall and storage against the existing chronological log on identical missions. |
| Validation and lineage | Define canonical event bytes, sequence, previous digest and authority. Verify tamper detection, duplication, forks and import conflicts before describing receipts as verifiable. Compensation events must handle spent cargo. |
| Capsule, phone or workstation | Keep a portable game passport distinct from device credentials. A future adapter imports a scoped mission and returns signed events. It must prove authenticated handoff and revocation between two real runtimes. |
| Offline continuity | Test restart, device clock changes, repeated replay and 72-hour disconnection with the same initial state. Record catch-up time, divergence and resource use. |
| External services | Device accounts, telecom access and external spending require separate service adapters and budgets. The local game loop uses only in-game assets. |

