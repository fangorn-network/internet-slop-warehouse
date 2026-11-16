import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');
const server = createServer(async (req, res) => {
    if (req.url === '/controls.js') {
        res.setHeader('Content-Type', 'text/javascript');
        return res.end(await readFile('parts/fps-controls.js'));
    }
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><style>canvas{display:block;background:#234;width:400px;height:250px}</style>
      <canvas></canvas><p>Selectable menu text</p><input value="Editable room code">
      <script type="module">
      import {attach} from './controls.js';
      window.controls=attach(document.querySelector('canvas'));
      window.events=[];
      for(const type of ['pointerdown','contextmenu','selectstart']) document.addEventListener(type,e=>events.push({type,prevented:e.defaultPrevented}));
      </script>`);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
let browser;
try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => window.controls);
    await page.mouse.move(100, 100);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(180, 140, { steps: 8 });
    let input = await page.evaluate(() => controls.input);
    assert(input.yaw < 0 && input.pitch < 0);
    assert.equal(input.fire, false);
    assert.equal(await page.evaluate(() => document.querySelector('p').dispatchEvent(new Event('selectstart', { bubbles: true, cancelable: true }))), false);
    await page.mouse.up({ button: 'right' });
    assert.equal(await page.evaluate(() => getSelection().toString()), '');
    const events = await page.evaluate(() => events);
    assert(events.some(e => e.type === 'pointerdown' && e.prevented));
    assert(events.some(e => e.type === 'contextmenu' && e.prevented));
    await page.mouse.move(220, 160);
    assert.equal((await page.evaluate(() => controls.input)).yaw, input.yaw);
    // Left fire, blur and lost capture must not leave stuck input.
    await page.mouse.down();
    assert.equal((await page.evaluate(() => controls.input)).fire, true);
    await page.evaluate(() => dispatchEvent(new Event('blur')));
    assert.equal((await page.evaluate(() => controls.input)).fire, false);
    await page.mouse.up();
    await page.mouse.down({ button: 'right' });
    await page.evaluate(() => document.querySelector('canvas').dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1 })));
    input = await page.evaluate(() => controls.input);
    await page.mouse.move(280, 200);
    assert.equal((await page.evaluate(() => controls.input)).yaw, input.yaw);
    await page.mouse.up({ button: 'right' });
    assert.equal(await page.evaluate(() => document.querySelector('input').dispatchEvent(new Event('contextmenu', { bubbles: true, cancelable: true }))), true);
    assert.equal(await page.evaluate(() => document.querySelector('p').dispatchEvent(new Event('selectstart', { bubbles: true, cancelable: true }))), true);
    await page.locator('input').fill('New room code');
    assert.equal(await page.locator('input').inputValue(), 'New room code');
    await page.evaluate(() => controls.dispose());
    assert.equal(await page.evaluate(() => document.querySelector('canvas').dispatchEvent(new Event('contextmenu', { bubbles: true, cancelable: true }))), true);
    console.log('Camera right-drag, native menu/selection suppression, release, blur, lost capture, firing, editable UI and disposal passed.');
} finally {
    await browser?.close();
    server.close();
}
