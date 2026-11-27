// Ashen Reach AI & Embodied Agent Engine
// Powers embodied crew interactions (Astra comms, situational awareness, combat co-pilot)
// and provides a standard Open AI Agent Harness (perception stream, action actuation, autopilot) for external AI agents.

export class CommsSystem {
  constructor() {
    this.messages = [];
    this.subscribers = new Set();
    this.lastAstraRemark = 0;
  }

  say(sender, text, priority = 'normal', tag = 'tactical') {
    const entry = {
      id: Date.now() + Math.random(),
      sender,
      text,
      priority,
      tag,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})
    };
    this.messages.push(entry);
    if (this.messages.length > 50) this.messages.shift();
    this.subscribers.forEach(cb => cb(entry, this.messages));
    return entry;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  checkAstra(state, clock) {
    if (clock - this.lastAstraRemark < 7) return; // Don't spam comms

    // Context-sensitive tactical remarks from Astra
    if (state.mode === 'journey') {
      const journey = state.journey;
      if (!journey) return;
      if (journey.alt < 50 && journey.alt > 5 && !this._saidTerrain) {
        this.say('Astra [Navigator]', `Altitude clearance ${Math.round(journey.alt)}m. Retro-thrusters standing by for touchdown.`, 'normal', 'flight');
        this._saidTerrain = true;
        this.lastAstraRemark = clock;
      } else if (journey.alt > 1000) {
        this._saidTerrain = false;
      }

      if (journey.target && journey.target.name !== this._lastTarget) {
        this._lastTarget = journey.target.name;
        this.say('Astra [Navigator]', `Vector locked on ${journey.target.name}. Cruise assist ready on your command.`, 'high', 'nav');
        this.lastAstraRemark = clock;
      }
    } else if (state.mode === 'flight') {
      if (state.enemies && state.enemies.length > 0 && !this._saidPatrol) {
        this.say('Astra [Tactical]', `Hostile interceptors detected! Shields online, spirit ready on reserve frequency.`, 'urgent', 'combat');
        this._saidPatrol = true;
        this.lastAstraRemark = clock;
      } else if (!state.enemies || state.enemies.length === 0) {
        if (this._saidPatrol) {
          this.say('Astra [Tactical]', `Airspace clear. Orbital sector secure, Captain.`, 'normal', 'combat');
          this._saidPatrol = false;
          this.lastAstraRemark = clock;
        }
      }

      if (state.hp < 25 && clock - (this._lastLowHull || 0) > 12) {
        this.say('Astra [Alert]', `Hull integrity critical (${state.hp})! Evade or summon spirit shield!`, 'urgent', 'alert');
        this._lastLowHull = clock;
        this.lastAstraRemark = clock;
      }
    }
  }
}

export const comms = new CommsSystem();

// AI Agent Perception & Action Harness ("For AI as well")
export class AgentHarness {
  constructor(gameRef) {
    this.game = gameRef;
    this.autopilotMode = null; // 'none' | 'combat' | 'survey' | 'transit'
    this.telemetryVisible = false;
    this.listeners = [];
  }

  // Get rich, structured observation for AI models / agents
  getPerception() {
    const g = this.game;
    if (!g) return null;

    const base = {
      timestamp: performance.now(),
      mode: g.mode,
      worldId: g.world?.id ?? 0,
      worldName: g.world?.name ?? 'Unknown',
      shipId: g.ship,
      hull: g.hp,
      maxHull: 100,
      bank: g.bank,
      spiritReady: g.spirit <= 0,
      spiritActive: g.spirit > 0
    };

    if (g.mode === 'journey' && g.journey) {
      const j = g.journey;
      base.navigation = {
        position: [j.p.x, j.p.y, j.p.z],
        velocity: [j.v.x, j.v.y, j.v.z],
        speed: j.v.length(),
        altitude: j.alt,
        bodyName: j.body?.name,
        targetName: j.target?.name,
        cruiseAssist: j.cruise,
        aimActive: j.aim
      };
    } else if (g.mode === 'flight') {
      base.combat = {
        playerPosition: [g.x, 0, g.z],
        enemyCount: g.enemies?.length || 0,
        enemies: (g.enemies || []).map((e, idx) => ({
          id: idx,
          x: e.x,
          z: e.z,
          distance: Math.hypot(e.x - g.x, e.z - g.z),
          bearing: Math.atan2(e.x - g.x, e.z - g.z),
          hp: e.hp
        })),
        shotsCount: g.shots?.length || 0,
        incomingThreats: (g.shots || []).filter(s => s.enemy).map(s => ({
          x: s.x,
          z: s.z,
          dist: Math.hypot(s.x - g.x, s.z - g.z)
        }))
      };
    } else if (g.mode === 'survey' && g.survey) {
      const s = g.survey;
      base.survey = {
        x: s.x,
        z: s.z,
        vx: s.vx,
        vz: s.vz,
        yaw: s.yaw,
        clearance: s.clearance,
        site: s.site,
        scans: s.scans
      };
    }

    return base;
  }

  // Actuation method for AI agents: submit action vector
  // action = { turn: [-1,1], throttle: [-1,1], lift: [-1,1], pitch: [-1,1], fire: bool, summon: bool }
  step(action = {}) {
    const g = this.game;
    if (!g) return false;

    if (g.mode === 'flight') {
      if (action.turn !== undefined) {
        g.x = Math.max(-9, Math.min(9, g.x + action.turn * 0.4));
        g.bank = action.turn;
      }
      if (action.throttle !== undefined) {
        g.z = Math.max(-5, Math.min(7, g.z - action.throttle * 0.4));
      }
      if (action.fire) {
        // Trigger weapon fire
        window.dispatchEvent(new CustomEvent('ai-action-fire'));
      }
      if (action.summon) {
        window.dispatchEvent(new CustomEvent('ai-action-summon'));
      }
    } else if (g.mode === 'journey' && g.journey) {
      const j = g.journey;
      if (action.cruise !== undefined) j.cruise = Boolean(action.cruise);
      if (action.targetId !== undefined) {
        const dest = j.system.find(b => b.id === action.targetId);
        if (dest) j.target = dest;
      }
    }
    return true;
  }

  // Built-in intelligent policies
  setAutopilot(mode) {
    this.autopilotMode = mode;
    comms.say('Astra [AI Core]', `Autopilot policy changed to: ${mode || 'Manual'}`, 'normal', 'system');
  }

  updateAutopilot(dt) {
    if (!this.autopilotMode || this.autopilotMode === 'none') return;
    const g = this.game;

    if (this.autopilotMode === 'combat' && g.mode === 'flight') {
      if (!g.enemies || g.enemies.length === 0) return;
      // Target nearest enemy
      let nearest = null;
      let minDist = Infinity;
      for (const e of g.enemies) {
        if (e.hp <= 0) continue;
        const dist = Math.hypot(e.x - g.x, e.z - g.z);
        if (dist < minDist) {
          minDist = dist;
          nearest = e;
        }
      }

      if (nearest) {
        // Track target laterally
        const dx = nearest.x - g.x;
        const turn = Math.sign(dx) * Math.min(1, Math.abs(dx) * 0.8);
        const throttle = nearest.z < -9 ? 0.8 : nearest.z > -4 ? -0.5 : 0;
        const fire = Math.abs(dx) < 1.4;
        const summon = g.hp < 40 && g.spirit <= 0;

        this.step({ turn, throttle, fire, summon });
      }
    }
  }
}
