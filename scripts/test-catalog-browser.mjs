import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');
const record = (id, type, payload) => ({ id, type, publisher: '0x1234567890abcdef', payload: { title: id, description: 'Browse fixture', tags: [], ...payload } });
const records = [record('Forest', 'game', { tags: ['survival', 'exploration'] }), record('Arcade', 'game', { tags: ['arcade'] }), record('Unknown', 'game', {}), record('Robot', 'asset', { mime: 'model/gltf-binary' }), record('Grass', 'asset', { mime: 'image/png' }), record('Guide', 'asset', { mime: 'text/markdown' }), record('Move', 'logic', { kind: 'controller' }), record('Splats', 'skill', { tags: ['skill'], skill: 'splats' }), record('Photoreal', 'skill', { tags: ['recipe'], skill: 'photoreal' }), record('Lerp', 'source', { origin: { repo: 'r', commit: 'c', path: 'p.js' } })];
const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path === '/view.json') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ root: 'fixture', records })); }
    const files = { '/': ['index.html', 'text/html'], '/warehouse.css': ['warehouse.css', 'text/css'], '/catalog.js': ['catalog.js', 'text/javascript'] };
    if (!files[path]) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', files[path][1]); res.end(await readFile('site/' + files[path][0]));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('.card').first().waitFor();
    assert.equal(await page.locator('.card').count(), 3);
    await page.getByRole('button', { name: 'Survival & crafting 1', exact: true }).click();
    assert.equal(await page.locator('.card').count(), 1);
    assert.match(await page.locator('.card h2').textContent(), /Forest/);
    assert.equal(await page.locator('[data-category=survival]').evaluate(el => el === document.activeElement), true);
    await page.locator('#q').fill('Arcade');
    await page.locator('.empty').waitFor();
    await page.locator('#clear-filters').click();
    assert.equal(await page.locator('.card').count(), 3);
    await page.getByRole('button', { name: 'Other 1', exact: true }).click();
    assert.equal(await page.locator('.card h2').textContent(), 'Unknown');
    await page.locator('[data-kind=asset]').click();
    assert.equal(await page.locator('.card').count(), 3);
    await page.getByRole('button', { name: '3D models 1', exact: true }).click();
    assert.equal(await page.locator('.card h2').textContent(), 'Robot');
    await page.locator('[data-kind=logic]').click();
    await page.getByRole('button', { name: 'Controls & movement 1', exact: true }).click();
    assert.equal(await page.locator('.card h2').textContent(), 'Move');
    await page.locator('[data-kind=skill]').click();
    assert.equal(await page.locator('.card').count(), 2);
    await page.getByRole('button', { name: 'Recipes 1', exact: true }).click();
    assert.equal(await page.locator('.card h2').textContent(), 'Photoreal');
    await page.locator('[data-kind=source]').click();
    assert.equal(await page.locator('.card h2').textContent(), 'Lerp');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/player/catalog-mobile-kinds.png' });
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('.kinds button')].every(b => b.scrollWidth <= b.clientWidth)), true, 'kind tabs fit on a phone');
    await page.locator('[data-kind=game]').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    // Semantic results must still respect the selected category.
    await page.route('**/search?*', route => route.fulfill({ json: [records[1], records[0]] }));
    await page.locator('[data-category=survival]').click();
    await page.locator('#q').fill('something');
    await page.waitForResponse(response => response.url().includes('/search?'));
    await page.locator('.card').waitFor();
    assert.equal(await page.locator('.card').count(), 1);
    assert.equal(await page.locator('.card h2').textContent(), 'Forest');
    assert.deepEqual(errors, []);
    console.log('Catalog passed: categories, counts, search, semantic intersection, clear, type switching (skills, recipes, source), keyboard focus, and mobile layout.');
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
