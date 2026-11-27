# Ashen Reach

Nine Lanterns was the last medical convoy to cross the Reach before the relays fell silent. Years later, a pilot hears a roll call coming through the hull. A voice answers for every lost ship. Then a tenth voice answers from a ship still in port.

The player captains a small crew among four worlds that depend on one another for heat, water, medicine and passage. Recovering the convoy means deciding who may hear its signal, who pays to fly the route, and whether a spirit has the right to refuse the living. The campaign follows those decisions. The sandbox stays open between chapters and after the ending.

## What a player can do today

The 0.7 baseline has three selectable hulls, walkable decks, a four-body continuous flight system, surface skimming and geographical mineral extraction. Cruise assist compresses travel time. Newtonian flight uses gravity and preserves momentum. The dedicated navigation plot shows predicted orbital extremes. In the surface survey, Astra can pilot a ship using a locally trained neural controller. The freeport district simulates moving freight carriers, sealed and medical consignments, customs inspections and refits. Patrol encounters support combat and spirit summons.

Claims, mining, district accounts and navigator history use browser storage. Colony infrastructure follows a reproducible quarter-hour clock. The optional observatory publishes frontier checkpoints. Geographic docks, walkable planetary cities, planet-to-planet NPC freight and shared online ownership are production milestones. The following sections distinguish the opening chapter from the continuation designed for later releases.

## The first playable chapter · The Choir Line

1. **Aurelia.** Recover four units of ferrite from the highlands. The material will rebuild a repeater strong enough to separate the roll call from ordinary drive noise.
2. **Nacre.** Deliver the ferrite at the freeport mineral exchange. The repaired repeater places Nine Lanterns near Orison. This trip ties the signal to actual cargo the captain had to carry.
3. **Orison.** Enter a combat patrol, summon the ship spirit to identify Nine Lanterns, and clear the blockade. The spirit supplies the identification that a weapons victory alone cannot establish.
4. **Broadcast.** Give control to the Lantern Guild or the Wakekeepers. The Guild establishes a ferrite purchase agreement on Nacre worth three extra credits per unit. The Wakekeepers teach the crew to restore its patrol spirit four seconds sooner. Both endings leave ordinary flight, trade and survey available.

These two outcomes carry into the design of the later acts below. Their wider social consequences are future campaign content.

## Four worlds and the people who live on them

| World | Place to approach from orbit | Work, interests and conflict | Playable geography to build |
|---|---|---|---|
| Aurelia · ferric highlands | The exposed red cut above Morrow Works; the smelter stacks emerge behind the ridge on approach. | Independent miners trade ferrite for ice. The Lantern Guild guarantees minimum prices in return for first claim on accessible seams. A shift forewoman knows which seams the old convoy used as navigation marks. | Skim or drive the haul road from pit to weighbridge. A claimant can reserve an exposed seam; a second miner must negotiate or seek another cell. |
| Nacre · tidal islands | Hearth Exchange occupies a chain of breakwaters. At low tide, the old receiving dock stands clear of the water. | Boat pilots, ship chandlers and medical dispatchers share the berths. A lucrative ferrite shipment can displace a clinic delivery from the next sailing. | Descend through a gap in the islands, transfer cargo to a dock tug, or take a passenger skiff into the exchange. Tide tables change the open approach. |
| Veyra · ammonia cloud belt | Relay Nine hangs below the upper cloud deck; light from its mooring cables appears before the platform. | Tenders harvest ammonia and supply the floating settlements. Their crews sell forecast windows to captains. A storm can keep a profitable fleet in port while an underfunded rescue launches. | Berth at a moving aerostat or descend to sample a cloud band. Pressure and buoyancy replace ground traction here. |
| Orison · basalt coast | Glass Hospice lights the landward end of a black coastal causeway. Its bells reproduce the frequencies of lost hulls. | Wakekeepers record a spirit's wishes before permitting a binding. The port authority wants the same records to settle salvage claims. Families disagree over who may speak for a vanished ship. | Walk the archive, escort a witness along the causeway, and take a cutter beyond the breakers to locate wreck glass. |

The chart can seed further worlds. A new inhabited system earns authored content when it has an import dependency, a recognizable approach, a resident with a continuing obligation, and a route whose failure changes a neighboring settlement.

## Campaign continuation · designed chapters

Act II cargo-delivery slice is merged in PR #7: four ammonia, Veyra location check, mutually exclusive clinic/condenser outcome, persistent payout. Physical towing, docking and downstream station consequences remain planned.

| Act | Jobs the captain can undertake | Decision and lasting consequence |
|---|---|---|
| II · Borrowed Air | Relay Nine's clinic refrigeration fails. Locate a tender below Veyra's clouds; tow it to a berth or split its load between two ships. The Guild opening offers insured carriage. The Wakekeeper opening lets the missing engineer identify an emergency mooring by sound. | Commit the recovered coolant to the clinic or the platform's main condenser. The clinic path preserves beds and creates paid repair runs. The condenser path keeps ore tenders airborne and creates evacuation jobs for patients. |
| III · The Tenth Berth | A ship repeatedly books a dock under a dead pilot's name. Follow its cargo through Hearth Exchange, then board when its captain grants access. The tenth voice is a living rescue pilot using the convoy's call sign to carry unregistered survivors. | File the manifest publicly or entrust it to the survivors. Public testimony clears a captain's old warrant and exposes a shelter; a sealed manifest keeps the shelter open and leaves the warrant outstanding. Both routes reach the next act with different witnesses. |
| IV · The Right of Passage | Gather witnesses, repair two relay approaches and escort the first mixed convoy through Orison. A missing witness changes the available testimony. Lost cargo creates a recovery contract and a delay. | A port charter gives stations responsibility for escort and insurance; pilots pay a published toll. A crew compact lets captains guarantee passage through pledged cargo; defaults create recovery jobs. The chosen route operates again in free play, and its costs appear on future manifests. |

No main chapter requires buying a particular hull. A Peregrine can scout and relay coordinates while a hired tender tows. A Bastion can carry the primary load and needs a wider turn into port. A Vesper can recover a spirit bearing during poor visibility. Delivery routes, witness availability, docking queues and postgame contracts carry story consequences back into flight.

## Sandbox systems and economy

**A voyage.** At the dock, read a manifest with mass, destination, time window, posted reward, estimated fuel and local inspection rules. Accept one contract, walk aboard, assign pilot or navigator, and leave through the harbor. Pick up an optional survey, salvage or rescue along the route. At the receiving berth, unload, inspect expenses, pay crew and choose the next job. A player who prefers exploration can sell new survey bearings; a player pursuing conflict can accept escorts or recover stolen cargo.

**Goods and construction.** Mines produce ferrite; Nacre supplies brine ice; Veyra's tenders recover ammonia; Orison exports basalt glass. In the proposed industrial model, yards consume ferrite to repair hulls, refrigeration consumes coolant, and relays consume glass assemblies. A governor reserves actual station inventory for a project, posts a shortage contract, and completes a visible structure only after delivery and labor. Haulers reserve a berth, load from stock, physically transit, and credit their employer after unloading. Losing the hauler creates a shortage and a salvage site. A compact pilot run uses one station of each type before extending the recipe graph.

**Balances and scarcity.** Today the mineral exchange and freight dispatcher each hold a separate balance. A migration must reconcile both without awarding the same credits twice. In the connected economy, reserve freight on acceptance, transfer title on pickup, and settle once on delivery using a manifest ID. Repairs, fuel, wages and storage remove credits. Prices respond to local inventory within published bounds. Starting medical courier work uses an employer-owned hold so an empty wallet never blocks recovery.

**Law, spirits and ownership.** A witnessed seizure produces an incident tied to a jurisdiction, vessel, cargo owner and observer. Customs can intercept a pilot for a recorded violation. Returning cargo, surrendering or completing restitution changes local standing. Spirits preserve testimony and can decline a summons under the planned charter system. A claim should grant survey or construction rights under the world's rules; existing residents retain property and can challenge an exclusive concession. Competition supports rivals, rescue and restitution alongside privateering.

## Embodied crews and MEDINA memory

In this game, presence means being at a location, occupying a ship or berth, controlling an assigned station, and changing the same world the captain sees. Astra's local survey controller already uses simulated ship inputs. In 0.7 Astra can take the continuous-flight helm and checkpoint a landing order. Its local landing atlas records the world, vessel, angular position, radius, context and observation sequence. A captain can spend four ferrite to build a visible, persistent service station on solid ground. Crew access to inhabited docks, streets and external devices remains planned.

| Capability | Game contract | Acceptance evidence |
|---|---|---|
| Board and take command | Store crew identity, vessel, station and duty. Validate occupancy and transfer controls at the helm. A captain's manual input can relieve the pilot. | Reload while assigned, board another hull, and verify only the current pilot can issue thrust. |
| Remember a place and a sequence | A MEDINA adapter can encode spherical bearings as theta and phi, distance as rho, a named context ring, and an integer simulation beat. Store reference-frame ID, units, source event and schema version together. Durable position remains recoverable at the poles and across angle wrap. | Restore a bridge visit and its predecessor after reload. Compare the recovered world, hull and event order. Evaluate harmonic scheduling separately against a fixed-step baseline. |
| Explain work | Propose a goal from fuel, load, local demand and crew orders. Choose a ship action, observe the result and append a receipt with actor, target, simulation tick, prior event and resulting inventory delta. | Interrupt a job after loading, resume it once, then reconstruct who received the cargo and payout. |
| Cross surfaces | Export a versioned crew passport and bounded memory payload to a future Capsule/THESIS adapter. Define signer, verifier, chain tip, revocation and an exclusive control lease before accepting incoming commands. | A second runtime resumes a crew identity and releases its old lease. Replayed receipts cannot duplicate cargo or control. |
| Operate offline | Persist snapshots and append events locally. On reconnect, compare parent event IDs, reconcile ownership and preserve disputed receipts for inspection. Reserve a local action budget before disconnecting. | Across a 72-hour offline test, measure save size, clock skew, restart behavior and resync conflicts on specified hardware. |

The supplied agent-phone review gives an architectural direction for portable presence. eSIM provisioning, account spending, external phone control, sovereign validation, the claimed edge endurance and cross-device reconciliation require separate implementation and evidence. A simulated crew member needs no telephone contract or financial identity to play. An eventual external adapter receives an explicitly scoped mission, expiry and budget; a simulation task cannot silently grant real-world spending authority.

## Production sequence and release gates

| Delivery | Dependency and work | Required playtest or operational evidence |
|---|---|---|
| Opening chapter | Existing journey, ore ledger, patrol, spirit and exchange. Persist chapter checkpoints and choice benefits. | Complete both branches from a clean save. Reload after material delivery and final choice; no duplicate rewards. |
| First connected harbor | Anchor one dock, resource field and AI berth in the planetary frame; add approach guidance, ship occupancy and safe disembarkation. | Fly from orbit to a visible berth, walk from ship to market, sell ore, and return to the same parked hull. |
| Living supply route | One unified ledger, inventory reservations, ship manifests, docking leases and ship-to-station settlement. | Follow a carrier from loading through delivery. Divert a cargo. Inspect the shortage and replacement posting; restart after each transfer. |
| First inhabited district | Traversable streets, tug or rover, civilian schedules, witness records, lawful repossession and pursuit. | Follow one named resident from home to shift to berth. Resolve an incident through surrender, restitution or escape with different persistent consequences. |
| Coalition campaign | Chapters II–IV, persistent faction choices, rescue contracts and postgame route selection. | QA traverses every authored ending, including cargo loss, crew reassignment, and a captain with zero credits. |
| Persistent sectors | Sector workers, ordered events, authoritative snapshots, migration and recovery. Interpolate occupied areas and summarize distant traffic. | With all browsers closed, a host continues a route. Two clients converge on one cargo owner and one berth allocation after reconnect. |
| Commercial mobile release | Pilot tutorial, readable touch controls, configurable sound and text, quality settings, content rights, save export and opt-in diagnostics. | Record sustained performance, memory pressure and thermal behavior on named iOS/Android devices; repeat a complete voyage after suspend, offline launch and OS interruption. Target 30 fps on the supported mobile tier. |

Ship each step as a voyage a player can finish. A new hull, city, institution or agent integration should change the decisions available during that voyage and leave a result the player can revisit.


## Studio production bible · expansion mandate

**Product identity.** Ashen Reach is a premium science-fiction role-playing and living-world simulation. The player begins as a captain with one ship, builds relationships with people and spirits, earns a living, and may become an explorer, trader, soldier, industrialist, settlement governor or fleet commander. No profession requires combat or online connectivity for the opening campaign. Expansion must deepen existing systems rather than replace them with disconnected minigames.

### Art direction and experience

The Reach is industrial, monumental and inhabited: weathered ceramic hulls, oxidized metal, dark basalt, restrained amber lights, pale blue navigation marks, dense atmosphere and immense negative space. Each planet has a distinct silhouette, palette, weather, architecture, soundscape and material economy. Avoid neon clutter and generic cockpit dashboards. The player sees a ship, not a web dashboard.

| Location | Visual anchor | Sound and interaction |
|---|---|---|
| Aurelia | Rust canyons, terraced mines, dust and monumental smelters | Wind, machinery, rock impacts; survey and extract |
| Nacre | Turquoise ocean, white concrete breakwaters, wet docks | Surf, cranes, radio chatter; berth and trade |
| Veyra | Layered cream clouds, lightning, suspended refinery cities | Pressure rumble, cable vibration; precision approach and rescue |
| Orison | Black basalt, violet dusk, hospice lanterns and wreck fields | Bells, surf and fractured radio; witness and recover |
| Frontier | Uncharted moons, ruins, wrecks and rare biospheres | Distinct environmental audio; discover and map |

Build modular glTF/GLB assets with documented licenses, physically based materials, baked occlusion, instancing, LODs, compressed textures and collision proxies. Use a shared scale convention (meters), reference transforms and artist validation tools. Preserve existing Three.js assets while introducing quality tiers. WebGPU is an optional validated renderer, WebGL2 the primary compatibility target, and existing software view the degraded fallback. Native builds are a later evaluation, not an assumed rewrite. Establish an authored hero scene at each capital, real screenshots and reproducible camera routes; concept art is not evidence of rendering quality.

### Game structure and progression

- **Opening:** learn to walk, board, pilot, land, mine, trade, summon and recover Nine Lanterns. Complete a first voyage without reading external documentation.
- **Midgame:** unlock licensed freight, rescue, salvage, ship repairs, exploration permits, apprentices, crew contracts and local reputation. Act II–IV choices change market availability, witnesses and public infrastructure.
- **Endgame:** acquire multiple hulls, assign captains, establish lawful concessions, finance stations and manage fleets. Govern through resource obligations, diplomacy and defensible supply routes rather than arbitrary experience thresholds.
- **Postgame:** keep the Reach running; authored expansions enter through physical gates and plausible local histories. No forced reset of ships, credits or relationships.

Proposed 1.0 content budget (subject to vertical-slice cost measurement): four fully connected founding worlds, four major ports, eight meaningful secondary sites, six modular playable hulls, twenty named recurring characters, four main acts, thirty authored side contracts and six reusable economic contract families. Expansion target: twelve systems and thirty-six distinct worlds, with procedural terrain supporting authored points of interest; do not count empty generated planets as finished content.

### Systems architecture

| Subsystem | Production contract |
|---|---|
| World simulation | Versioned deterministic sector state, fixed simulation ticks, seeded randomness, spatial interest management, bounded catch-up, clock injection for tests. |
| Flight and traversal | Canonical vessel pose, local origin rebasing, collision/landing, docking lease, walking navmesh, airlock transitions, recovery at safe berth. No teleport disguised as seamless travel. |
| Economy | Integer quantities and credits, unified ledger, inventory ownership, escrow, reservations, idempotent settlement, bounded scarcity pricing, balanced sources and sinks, auditable event IDs. |
| Combat | Ship and ground movement, energy/heat budgets, damage zones, shields, AI threat assessment, rescue and repair, configurable input and difficulty. Server validates outcomes online. |
| People and factions | Stable identity, schedules, location, obligations, dialogue state, relationship history, jurisdiction and reputation. NPC behavior must affect the same economy and world as the player. |
| Spirits | Named companions with consent, abilities, cooldowns, relationships and recoverable testimony. Keep effects mechanically explicit and accessible. |
| Construction | Site authorization, recipes, material delivery, workforce, progress and maintenance. Completed structures are actual persistent scene entities. |
| Missions | Versioned objective graphs, preconditions, failure/recovery paths, branching outcomes, durable checkpoints, replay protection and journal. |
| Persistence | Schema migrations, transactional snapshot plus ordered events, checksums, backups, export/import and recovery. Browser storage remains offline baseline; IndexedDB migration precedes large saves. |
| Online | Authenticated sessions, server-owned sector state, command validation, exclusive control leases, reconciliation, rate limits, abuse reporting, privacy and deletion controls. No client-trusted currency. |
| Tools | Content schemas, world editor, mission validator, asset manifest, deterministic replay inspector, crash reports with opt-in diagnostics, performance captures and localization extraction. |

### Embodied intelligence platform

Astra is a character with a body, location, assigned duties, permissions and memory. Agents use the exact same validated commands as human players. Goal selection reads bounded observations; planners propose feasible tasks; deterministic execution validates resources and leases; receipts record outcomes. Manual captain control has priority. Agents cannot create credits, bypass collisions, read another player's private state or access real-world tools by default.

Agent lifecycle: observe → prioritize → plan → reserve → execute → inspect → commit receipt → remember → recover or sleep. Every mission has a simulation-time budget, allowed actions, inventory allowance, cancellation token and maximum retry count. Local deterministic policies cover basic operations without a model; optional inference improves planning/dialogue only, with constrained outputs and safe fallback. Geometric MEDINA memory stores reference frame, theta, phi, rho, context ring and beat alongside stable entity IDs and evidence. Evaluate retrieval, continuity and recovery against ordinary event-indexed memory; no unsupported cognitive claims.

External passport interoperability is a separately permissioned adapter, not a prerequisite to play. Never expose secrets, financial authority or external device control to an in-game NPC.

### Delivery grid and agent work loop

| Lane | First deliverable | Dependency | Definition of done |
|---|---|---|---|
| AR-01 Flight | Nacre approach, berth and return | existing deep flight | Recorded full voyage with safe reload |
| AR-02 Scene | Nacre harbor hero environment | AR-01 coordinates | Authored collision, LOD, measured frame pacing |
| AR-03 Economy | unified cargo and credit transactions | ledger migration | conservation, restart and duplicate-command tests |
| AR-04 Agents | autonomous freight crew | AR-01, AR-03 | observed loading, flight, berth, delivery and receipts |
| AR-05 Campaign | expand Borrowed Air physical rescue | AR-01, AR-03 | both branches, loss recovery, persistent consequences |
| AR-06 Population | first walkable district and schedules | AR-02, AR-03 | named resident completes shift and reacts to shortage |
| AR-07 Combat | pursuit, damage and rescue loop | flight/ledger | complete encounter and recovery with no duplicated loot |
| AR-08 Content | validated mission and asset pipeline | schemas | deterministic content build and license manifest |
| AR-09 Online | authoritative sector vertical slice | AR-03, AR-04 | concurrent clients, leases, reconnect and fault injection |
| AR-10 Release | performance, accessibility, packaging | all shipped lanes | real device playtests, verified rollback and save migration |

Each development agent claims one scoped task, reads canonical files, states acceptance criteria, implements on a branch, runs unit/integration/replay tests, captures a real interaction, opens a reviewed change, resolves regressions and hands off an evidence receipt. Dependencies must be satisfied before claiming a downstream feature complete. Keep the main branch playable; retain a known-good package and reversible migrations. Parallel work must own separate files or coordinate shared contracts. No indefinite unattended execution is implied by this document.

### Release certification

Proposed targets, not measured results: 60 fps desktop at 1080p on a named midrange GPU; 30 fps on selected mobile devices; p95 frame budgets 16.7/33.3 ms respectively; initial playable load under 10 seconds on a documented connection; no critical save loss; repeatable 72-hour agent/economy soak; first online test 32 concurrent players per sector, then increase only after measured capacity. Accessibility includes rebindable controls, subtitles, reduced motion, readable scalable text, contrast, non-color-only cues and controller/touch verification.

Release gates: unit invariants, deterministic integration tests, full voyage browser replay, screenshot review, device performance, license audit, security review, migration from previous saves, clean installation, package integrity, rollback rehearsal, and player acceptance. A passing CI check is necessary but does not substitute for playtesting. Track every feature as DESIGN / PARTIAL / IMPLEMENTED / VERIFIED / RELEASED with commit, test command, environment and evidence. Never call an unverified feature production-ready.

### Commercial and operating strategy

Ship an offline-capable premium game first; optional online sectors and substantive expansions follow real demand and demonstrated hosting economics. Avoid pay-to-win, speculative token economies and dependency on hosted inference for essential play. Final pricing, platforms, headcount, budget and launch date require owner approval and measured production velocity. Track cost per authored location, content throughput, crash-free sessions, first-voyage completion, retention, support burden and online cost per active player. Review the roadmap after each verified vertical slice.

### Milestone sequence

0.8 Connected Harbor: one beautiful physical port and complete voyage.
0.9 Living Reach: unified economy, visible carriers, persistent crew and Act II rescue.
0.10 Inhabited Worlds: all four founding ports, residents, traversal and ground encounters.
0.11 Coalition: complete campaign, fleet command and construction.
0.12 Persistent Sectors: optional authoritative multiplayer and recovery.
1.0: content-complete, optimized, accessible, certified and commercially packaged. Milestone numbers are proposals, not dates or release claims.

The standard is a finished interaction, not a feature name. Every new system must improve the same playable universe.
