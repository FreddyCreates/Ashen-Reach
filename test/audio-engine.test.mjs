import assert from 'node:assert/strict';
import test from 'node:test';
import {audio} from '../dist/audio-engine.mjs';

test('Procedural Sound Engine initializes cleanly without DOM / WebAudio crashes', () => {
  assert.equal(audio.enabled, true);
  assert.equal(audio.initialized, false); // Safe in Node.js test environment
  
  // Safe calls when WebAudio is absent in headless Node
  audio.init();
  audio.laser(false);
  audio.impact(true);
  audio.spiritSummon();
  audio.warpJump();
  audio.uiClick('click');
  audio.updateEngine(1.0, 0.5, true);
  audio.setMuted(true);
  audio.setVolume(0.5, 0.2);

  assert.equal(audio.sfxVolume, 0.5);
  assert.equal(audio.musicVolume, 0.2);
});
