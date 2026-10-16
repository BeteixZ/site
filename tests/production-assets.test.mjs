import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

test('production HTML references each interaction asset with exactly one Pages prefix', () => {
  const output = mkdtempSync(path.join(tmpdir(), 'bindow-production-'));
  try {
    const build = spawnSync(process.execPath, [
      path.join(root, 'node_modules/@11ty/eleventy/cmd.cjs'), `--output=${output}`,
    ], { cwd: root, env: { ...process.env, NODE_ENV: 'production' }, encoding: 'utf8' });
    assert.equal(build.status, 0, build.stderr || build.stdout);

    const shared = ['/css/style.css?v=interactions-1', '/css/theme.css', '/js/music.js?v=records-1', '/js/theme.js'];
    for (const [page, extra] of [
      ['index.html', []],
      ['music/index.html', ['/css/record-shelf.css']],
      ['projects/index.html', ['/css/heat-experiment.css', '/js/heat-experiment.js']],
    ]) {
      const html = readFileSync(path.join(output, page), 'utf8');
      const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
      for (const asset of [...shared, ...extra]) {
        const expected = `/site${asset}`;
        assert.ok(urls.includes(expected), `${page} must reference ${expected} exactly`);
        assert.ok(existsSync(path.join(output, asset.split('?')[0])), `${asset} must be built`);
      }
      assert.ok(!urls.some(url => url.startsWith('/site/site/')), `${page} duplicates its Pages prefix`);
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});
