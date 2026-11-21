import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../public/control.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/control.css', import.meta.url), 'utf8');
const page = readFileSync(new URL('../public/control.js', import.meta.url), 'utf8');

test('control desk keeps operator hooks and stays offline', () => {
  for (const id of [
    'switch-mode', 'open-output', 'copy-output', 'open-meet', 'connection', 'rehearsal-note',
    'event-divisions', 'active-event-picker', 'edit-active', 'new-event', 'operations',
    'open-schedule', 'open-ranks', 'open-roster', 'school-schedule', 'ranking-panel',
    'rank-search', 'rank-rows', 'rank-pager', 'competitors', 'roster-rows', 'preview',
    'monitor-backdrop', 'monitor-guides', 'module-list', 'layout-inspector', 'editor', 'toast',
  ]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /data-action="work-view"/);
  assert.match(html, /data-action="workspace"/);
  assert.match(html, /id="open-ranks"[^>]*>名次</);
  assert.match(html, /id="ranking-title">名次</);
  assert.doesNotMatch(`${html}\n${css}`, /fonts\.google|cdn\.|@import|url\(https?:|@font-face/);
  assert.match(css, /color-scheme:\s*normal/);
  assert.match(page, /rehearsal-note/);
  assert.match(page, /清空画面/);
});
