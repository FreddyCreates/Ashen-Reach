import test from 'node:test';
import assert from 'node:assert/strict';
import {frontier,world,resolveChartWorld} from '../dist/universe.mjs';
test('growing chart resolves old and outer worlds directly without allowing undiscovered sectors',()=>{
 const tick=4000,edge=frontier(tick)-1;
 assert.equal(resolveChartWorld('  nACRe   2  ',tick),9);
 assert.equal(resolveChartWorld(world(edge,tick).name,tick),edge);
 assert.equal(resolveChartWorld('sector '+edge,tick),edge);
 assert.equal(resolveChartWorld('Aurelia',tick),0);
 assert.equal(resolveChartWorld('#'+(edge+1),tick),null);
 assert.equal(resolveChartWorld('Aurelia 0',tick),null);
 assert.equal(resolveChartWorld('Aurelia 1',tick),null);
 assert.equal(resolveChartWorld('unknown',tick),null);
 assert.equal(resolveChartWorld('#'+(edge+1),tick+8),edge+1);
});
