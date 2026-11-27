import assert from 'node:assert/strict';
import test from 'node:test';
import {comms, AgentHarness} from '../dist/ai-engine.mjs';

test('AI Comms System records, filters, and broadcasts messages', () => {
  let received = null;
  const unsubscribe = comms.subscribe((entry) => {
    received = entry;
  });

  const sent = comms.say('Astra [Test]', 'Sensors nominal', 'normal', 'test');
  assert.equal(received.text, 'Sensors nominal');
  assert.equal(received.sender, 'Astra [Test]');
  assert.ok(comms.messages.length > 0);

  unsubscribe();
});

test('AgentHarness exposes perception stream and actuation for AI agents', () => {
  const mockGame = {
    mode: 'flight',
    world: { id: 1, name: 'Nacre' },
    ship: 0,
    hp: 80,
    bank: 0,
    spirit: 0,
    x: 0,
    z: 2,
    enemies: [{ x: 2, z: -8, hp: 3 }],
    shots: []
  };

  const harness = new AgentHarness(mockGame);
  const perception = harness.getPerception();

  assert.equal(perception.worldName, 'Nacre');
  assert.equal(perception.mode, 'flight');
  assert.equal(perception.combat.enemyCount, 1);
  assert.equal(perception.combat.enemies[0].hp, 3);

  // Actuation step
  harness.step({ turn: 0.5, throttle: 0.8 });
  assert.ok(mockGame.x > 0);
  assert.equal(mockGame.bank, 0.5);

  // Autopilot policy update
  harness.setAutopilot('combat');
  assert.equal(harness.autopilotMode, 'combat');
  harness.updateAutopilot(0.016);
  // Ship turns toward enemy
  assert.ok(mockGame.bank > 0);
});
