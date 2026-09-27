const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const { fixture, mock } = require('./fixture.cjs');

const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5179';
const output = process.env.UI_ARTIFACT_DIR;
const metrics = [];
let browser, server, response;

before(async () => {
    if (!process.env.UI_BASE_URL) {
        server = spawn(
            process.execPath,
            [
                'node_modules/vite/bin/vite.js',
                '--host',
                '127.0.0.1',
                '--port',
                '5179',
                '--strictPort',
            ],
            { cwd: path.resolve(__dirname, '..'), stdio: 'ignore' }
        );
        for (let attempt = 0; attempt < 100; attempt++) {
            try {
                if ((await fetch(base)).ok) break;
            } catch {
                /* wait for the local server */
            }
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
    }
    response = await fixture();
    browser = await chromium.launch({
        channel: process.env.UI_BROWSER_CHANNEL || undefined,
        headless: true,
        args: ['--enable-unsafe-swiftshader'],
    });
    if (output) await fs.mkdir(output, { recursive: true });
});
after(async () => {
    await browser?.close();
    server?.kill();
    if (output)
        await fs.writeFile(
            path.join(output, 'viewport-results.json'),
            JSON.stringify(metrics, null, 2)
        );
});

async function pageAt(width = 360, height = 800, data = response, extra = {}) {
    const page = await browser.newPage({
        viewport: { width, height },
        deviceScaleFactor: 2,
        ...extra,
    });
    page.setDefaultTimeout(12000);
    const state = await mock(page, data);
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Project planner', exact: true }).waitFor();
    return { page, state };
}

async function fits(page, label) {
    const result = await page.evaluate(() => {
        const root = document.documentElement;
        const visible = (element) =>
            element.checkVisibility() && !element.closest('details:not([open]) > :not(summary)');
        const beyond = [...document.querySelectorAll('body *')]
            .filter((element) => {
                if (
                    !visible(element) ||
                    element.closest(
                        '.cost-table-wrap, .blueprint-frame, .supplier-map, .visually-hidden'
                    )
                )
                    return false;
                const rect = element.getBoundingClientRect();
                return rect.right > root.clientWidth + 1 || rect.left < -1;
            })
            .slice(0, 8)
            .map((element) => `${element.tagName}.${element.className}`);
        const croppedControls = [
            ...document.querySelectorAll('button, .residence-option, .draggable, .tool-btn'),
        ]
            .filter((element) => visible(element) && element.scrollWidth > element.clientWidth + 1)
            .map((element) => element.textContent.trim());
        const media = [
            ...document.querySelectorAll(
                '.pdf-frame, .scene-canvas, .supplier-map, .response-box img'
            ),
        ]
            .filter(
                (element) =>
                    visible(element) &&
                    element.getBoundingClientRect().width >
                        element.parentElement.getBoundingClientRect().width + 1
            )
            .map((element) => element.className);
        return {
            innerWidth,
            clientWidth: root.clientWidth,
            scrollWidth: root.scrollWidth,
            devicePixelRatio,
            rootFont: getComputedStyle(root).fontSize,
            visualViewport: visualViewport && {
                width: visualViewport.width,
                height: visualViewport.height,
                scale: visualViewport.scale,
            },
            header: document.querySelector('.header').getBoundingClientRect().height,
            navigation: document.querySelector('.sidebar').getBoundingClientRect().height,
            rootOverflow: getComputedStyle(root).overflowX,
            bodyOverflow: getComputedStyle(document.body).overflowX,
            beyond,
            croppedControls,
            media,
        };
    });
    metrics.push({ label, ...result });
    assert.ok(
        result.scrollWidth <= result.clientWidth + 1,
        `${label}: page width ${result.scrollWidth}/${result.clientWidth}`
    );
    assert.deepEqual(result.beyond, [], `${label}: elements outside viewport`);
    assert.deepEqual(result.croppedControls, [], `${label}: content wider than controls`);
    assert.deepEqual(result.media, [], `${label}: oversized media`);
    assert.ok(!['clip', 'hidden'].includes(result.rootOverflow), `${label}: root clipping`);
    if (!(await page.locator('#design-result.is-expanded').count()))
        assert.ok(!['clip', 'hidden'].includes(result.bodyOverflow));
    return result;
}

async function screenshot(page, name) {
    if (output) await page.screenshot({ path: path.join(output, `${name}.png`) });
}
async function generate(page) {
    await page
        .getByRole('button', { name: 'Add Concrete block to the design box', exact: true })
        .click();
    await page.getByRole('button', { name: 'Generate design', exact: true }).click();
    await page.getByRole('button', { name: 'Spreadsheet', exact: true }).waitFor();
}

for (const [width, height] of [
    [320, 568],
    [360, 640],
    [375, 812],
    [390, 844],
    [412, 915],
    [430, 932],
    [640, 360],
    [768, 1024],
    [1024, 768],
    [1280, 800],
    [1440, 900],
]) {
    test(`reflow and outputs at ${width} × ${height} CSS pixels`, async (t) => {
        const { page } = await pageAt(width, height);
        t.after(() => page.close());
        const initial = await fits(page, `${width}x${height} initial`);
        assert.ok(initial.header >= 56 && initial.header <= 64);
        if (width === 360 || width === 1440) await screenshot(page, `after-planner-${width}`);
        await page.getByRole('button', { name: 'Menu', exact: true }).click();
        await fits(page, `${width} menu`);
        await page
            .locator('#site-menu')
            .getByRole('button', { name: 'Close', exact: true })
            .click();
        await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
        await fits(page, `${width} 200% planner`);
        await page.evaluate(() => document.documentElement.style.removeProperty('font-size'));
        await page
            .getByLabel('Concept name', { exact: true })
            .fill('Courtyard project ' + 'long-name-'.repeat(5));
        await page.getByRole('radio', { name: 'Informal settlement', exact: true }).check();
        await page.getByRole('link', { name: 'Materials', exact: true }).click();
        await fits(page, `${width} materials`);
        await page
            .getByRole('button', { name: 'Add Concrete block to the design box', exact: true })
            .click();
        await page
            .getByRole('button', { name: 'Add Concrete block to the design box', exact: true })
            .click();
        assert.equal(
            await page.getByRole('button', { name: 'Remove Concrete block', exact: true }).count(),
            2
        );
        await page.getByRole('link', { name: 'Selection', exact: true }).click();
        await fits(page, `${width} populated selection`);
        await page
            .getByRole('button', { name: 'Remove Concrete block', exact: true })
            .first()
            .click();
        assert.equal(
            await page.getByRole('button', { name: 'Remove Concrete block', exact: true }).count(),
            1
        );
        await page.getByRole('link', { name: 'Design', exact: true }).click();
        await fits(page, `${width} empty design`);
        await page.getByRole('button', { name: 'Generate design', exact: true }).click();
        await page.getByRole('button', { name: 'Spreadsheet', exact: true }).click();
        await fits(page, `${width} costs and suppliers`);
        if (width === 360 || width === 1440) await screenshot(page, `after-costs-${width}`);
        await page.getByRole('button', { name: 'AI generated image', exact: true }).click();
        await fits(page, `${width} image preview`);
        await page.getByRole('button', { name: 'Blueprint', exact: true }).click();
        await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
        await fits(page, `${width} zoomed blueprint`);
        await page.getByRole('button', { name: 'Fit', exact: true }).click();
        if (width === 360) await screenshot(page, 'after-blueprint-360');
        await page.getByRole('button', { name: 'PDF', exact: true }).click();
        await page.getByText('Preview PDF', { exact: true }).click();
        await fits(page, `${width} PDF preview`);
        await page.getByRole('button', { name: 'Close design preview', exact: true }).click();
        assert.match(
            await page.getByLabel('Concept name', { exact: true }).inputValue(),
            /Courtyard project/
        );
        assert.equal(
            await page.getByRole('radio', { name: 'Informal settlement', exact: true }).isChecked(),
            true
        );
    });
}

test('menu, saved preferences, keyboard focus, 200% text and short viewport', async (t) => {
    const { page } = await pageAt(320, 568);
    t.after(() => page.close());
    await page.getByLabel('Concept name', { exact: true }).fill('Keep my project');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    assert.equal(
        await page.locator('#site-menu').evaluate((el) => el.contains(document.activeElement)),
        true
    );
    await page.keyboard.press('Shift+Tab');
    assert.equal(
        await page.locator('#site-menu').evaluate((el) => el.contains(document.activeElement)),
        true
    );
    await page.getByRole('button', { name: 'Guide', exact: true }).click();
    await page.locator('#howto-dialog').getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(
        await page
            .getByRole('button', { name: 'Guide', exact: true })
            .evaluate((el) => el === document.activeElement),
        true
    );
    await page.getByRole('button', { name: 'Terms', exact: true }).click();
    await page.locator('#terms-dialog').getByRole('button', { name: 'Close', exact: true }).click();
    for (const size of ['Large', 'Larger']) {
        await page.getByRole('button', { name: `${size} text size`, exact: true }).click();
        await fits(page, `${size} menu 320`);
        await page
            .locator('#site-menu')
            .getByRole('button', { name: 'Close', exact: true })
            .click();
        await fits(page, `${size} planner 320`);
        await page.getByRole('button', { name: 'Menu', exact: true }).click();
    }
    await page.getByRole('button', { name: 'High contrast', exact: true }).click();
    await page.getByRole('button', { name: 'Reduce motion', exact: true }).click();
    const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('saerbridge-a11y')));
    assert.deepEqual(prefs, { textSize: 'larger', contrast: 'high', motion: 'reduce' });
    await page.keyboard.press('Escape');
    assert.equal(
        await page
            .getByRole('button', { name: 'Menu', exact: true })
            .evaluate((el) => el === document.activeElement),
        true
    );
    assert.equal(
        await page.getByLabel('Concept name', { exact: true }).inputValue(),
        'Keep my project'
    );
    await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
    await fits(page, '200% planner 320');
    await page.getByLabel('Project section', { exact: true }).waitFor({ state: 'visible' });
    const [logo, menu] = await Promise.all([
        page.locator('.logo').boundingBox(),
        page.locator('.menu-trigger').boundingBox(),
    ]);
    assert.ok(
        logo.x + logo.width <= menu.x + 1 || logo.y + logo.height <= menu.y + 1,
        'brand and Menu must not overlap'
    );
    await screenshot(page, 'after-text-200-320');
    await page.getByLabel('Project section', { exact: true }).selectOption('materials');
    await fits(page, '200% material tiles 320');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.setViewportSize({ width: 320, height: 320 });
    await fits(page, '200% menu short 320');
    await page.getByRole('button', { name: 'Install app', exact: true }).click();
    await fits(page, 'install dialog short 320');
    await page
        .locator('.install-dialog')
        .getByRole('button', { name: 'Close', exact: true })
        .click();
    await page.locator('#site-menu').getByRole('button', { name: 'Close', exact: true }).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('html').getAttribute('data-text'), 'larger');
    assert.equal(await page.locator('html').getAttribute('data-contrast'), 'high');
});

test('CSV matches the displayed costs, is outside the scroller, and is invalidated on editing', async (t) => {
    const { page, state } = await pageAt();
    t.after(() => page.close());
    await generate(page);
    await page.getByRole('button', { name: 'Spreadsheet', exact: true }).click();
    const csv = page.getByRole('link', { name: 'Download costs (CSV)', exact: true });
    assert.equal(await csv.evaluate((el) => Boolean(el.closest('.cost-table-wrap'))), false);
    const before = await csv.boundingBox();
    await page.locator('.cost-table-wrap').evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
    });
    const afterScroll = await csv.boundingBox();
    assert.deepEqual(afterScroll, before);
    assert.match(await page.locator('.cost-estimate-total').innerText(), /50\s?148,00/);
    const [download] = await Promise.all([page.waitForEvent('download'), csv.click()]);
    assert.equal(download.suggestedFilename(), 'HomeDesignCostEstimate.csv');
    assert.deepEqual(
        await fs.readFile(await download.path()),
        Buffer.from(response.spreadsheet, 'base64')
    );
    assert.match(
        (await fs.readFile(await download.path())).toString('utf8'),
        /'\+Formula safety fixture/
    );
    assert.equal(state.requests, 1, 'export must not regenerate');
    if (output) await download.saveAs(path.join(output, download.suggestedFilename()));
    await page.setViewportSize({ width: 320, height: 568 });
    await page.evaluate(() => (document.documentElement.style.fontSize = '32px'));
    await fits(page, '200% completed costs 320');
    await csv.scrollIntoViewIfNeeded();
    await screenshot(page, 'after-costs-text-200-320');
    await page.getByRole('button', { name: 'Close design preview', exact: true }).click();
    await page.getByLabel('Concept name', { exact: true }).fill('New revision');
    assert.equal(await page.locator('[download="HomeDesignCostEstimate.csv"]').count(), 0);
    assert.equal(state.requests, 1);
    await page.setViewportSize({ width: 1440, height: 900 });
    assert.equal(
        await page.getByLabel('Concept name', { exact: true }).inputValue(),
        'New revision'
    );
    assert.equal(
        await page.getByRole('button', { name: 'Remove Concrete block', exact: true }).count(),
        1
    );
});

test('validation, long upload names, consent and local edits survive navigation', async (t) => {
    const { page, state } = await pageAt(320, 568);
    t.after(() => page.close());
    await page.getByLabel('Plot width (m)', { exact: true }).fill('-2');
    await page.getByLabel('Concept name', { exact: true }).focus();
    assert.equal(
        await page.getByLabel('Plot width (m)', { exact: true }).getAttribute('aria-invalid'),
        'true'
    );
    await fits(page, 'validation errors 320');
    await page
        .locator('input[type=file]')
        .first()
        .setInputFiles({
            name: 'A-very-long-project-photograph-'.repeat(5) + '.png',
            mimeType: 'image/png',
            buffer: Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAGUlEQVQokWN49/E+SYhhVMPH0VB6N1yTBgBBDb4f3R0+PQAAAABJRU5ErkJggg==',
                'base64'
            ),
        });
    await page.locator('.site-photo-name').waitFor();
    await fits(page, 'long photograph filename 320');
    assert.equal(
        await page.getByRole('button', { name: 'Generate design', exact: true }).count(),
        0
    );
    await page.getByRole('checkbox', { name: /I have permission/ }).check();
    assert.equal(
        await page.getByRole('button', { name: 'Generate design', exact: true }).count(),
        1
    );
    await page.getByRole('link', { name: 'Materials', exact: true }).click();
    await page.getByText('Seating', { exact: true }).click();
    await page.getByRole('button', { name: 'Add Sofa to the design box', exact: true }).click();
    await fits(page, 'furniture selection 320');
    await page.getByRole('button', { name: 'Remove Sofa', exact: true }).click();
    await page.setViewportSize({ width: 640, height: 360 });
    assert.equal(await page.getByRole('checkbox', { name: /I have permission/ }).isChecked(), true);
    assert.equal(state.requests, 0);
    await page.getByRole('button', { name: 'Remove', exact: true }).click();
    assert.equal(
        await page.getByRole('button', { name: 'Generate design', exact: true }).count(),
        0
    );
});

test('loading, error and unavailable exports remain readable', async (t) => {
    let release;
    const pending = new Promise((resolve) => {
        release = resolve;
    });
    const { page } = await pageAt(320, 568, () => pending);
    t.after(() => page.close());
    await page
        .getByRole('button', { name: 'Add Concrete block to the design box', exact: true })
        .click();
    await page.getByRole('button', { name: 'Generate design', exact: true }).click();
    await page.locator('.generation-progress').waitFor();
    await fits(page, 'loading 320');
    release({ error: 'Deterministic generation failure' });
    await page.locator('#design-result').getByRole('alert').first().waitFor();
    await fits(page, 'generation error 320');
    const missing = await pageAt(320, 568, {
        ...response,
        spreadsheet: '',
        spreadsheetStatus: 'unavailable',
        pdf: '',
        pdfStatus: 'unavailable',
        costAnalysis: null,
    });
    t.after(() => missing.page.close());
    await generate(missing.page);
    await missing.page.getByRole('button', { name: 'Spreadsheet', exact: true }).click();
    assert.equal(
        await missing.page.getByRole('link', { name: 'Download costs (CSV)', exact: true }).count(),
        0
    );
    assert.match(await missing.page.locator('.cost-preview').innerText(), /CSV is unavailable/);
    await fits(missing.page, 'unavailable costs 320');
    await missing.page.getByRole('button', { name: 'PDF', exact: true }).click();
    assert.match(await missing.page.locator('.pdf-preview').innerText(), /temporarily unavailable/);
});

test('3D geometry and downloadable assets stay on the same plan revision', async (t) => {
    const { page, state } = await pageAt(360, 800);
    t.after(() => page.close());
    await generate(page);
    await page.getByRole('button', { name: '3D model', exact: true }).click();
    await page.locator('.scene-canvas canvas').waitFor();
    await fits(page, '3D canvas 360');
    await page.getByRole('button', { name: 'Show dimensions', exact: true }).click();
    assert.match(await page.locator('.scene-viewer').innerText(), /36 m²/);
    await page.getByRole('button', { name: 'Top', exact: true }).click();
    await page.getByRole('button', { name: 'Hide roof', exact: true }).click();
    await screenshot(page, 'after-3d-360');
    const [glb] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Download GLB', exact: true }).click(),
    ]);
    assert.equal(
        glb.suggestedFilename(),
        `responsive-fixture-rev-${response.projectPlan.revision}.glb`
    );
    assert.equal((await fs.readFile(await glb.path())).toString('utf8', 0, 4), 'glTF');
    await page.getByRole('button', { name: 'Blueprint', exact: true }).click();
    assert.match(await page.locator('.blueprint-preview').innerText(), /36 m²/);
    for (const [label, expected] of [
        ['Download SVG', response.blueprintSvg],
        ['Download DXF', response.blueprintDxf],
    ]) {
        const [file] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('link', { name: label, exact: true }).click(),
        ]);
        assert.equal(await fs.readFile(await file.path(), 'utf8'), expected);
    }
    await page.getByRole('button', { name: 'PDF', exact: true }).click();
    const [pdf] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('link', { name: 'Download PDF', exact: true }).click(),
    ]);
    assert.equal(pdf.suggestedFilename(), 'HomeDesignInstructions.pdf');
    assert.deepEqual(await fs.readFile(await pdf.path()), Buffer.from(response.pdf, 'base64'));
    assert.equal(
        await page.getByRole('link', { name: 'Open PDF', exact: true }).getAttribute('target'),
        '_blank'
    );
    assert.equal(state.requests, 1);
});

test('system contrast, reduced motion and simulated standalone display', async (t) => {
    const { page } = await pageAt(412, 915, response, {
        forcedColors: 'active',
        reducedMotion: 'reduce',
    });
    t.after(() => page.close());
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await fits(page, 'system forced colours 412');
    await screenshot(page, 'after-forced-colours-412');
    await page.addInitScript(() => {
        const original = window.matchMedia.bind(window);
        window.matchMedia = (query) =>
            query === '(display-mode: standalone)'
                ? { ...original(query), matches: true }
                : original(query);
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Install app', exact: true }).count(), 0);
    await fits(page, 'simulated standalone 412');
});

test('section navigation follows explicit choices and browser history on desktop', async (t) => {
    const { page } = await pageAt(1440, 900);
    t.after(() => page.close());
    const selection = page.getByRole('link', { name: 'Selection', exact: true });
    const materials = page.getByRole('link', { name: 'Materials', exact: true });
    assert.equal(await selection.getAttribute('aria-current'), 'location');
    await screenshot(page, 'after-planner-1440');
    await materials.click();
    assert.equal(await materials.getAttribute('aria-current'), 'location');
    await selection.click();
    await page.goBack();
    await page.waitForFunction(() => document.querySelector('.section-links a[aria-current]')?.getAttribute('href') === '#materials');
    await page.setViewportSize({ width: 320, height: 568 });
    await page.evaluate(() => document.documentElement.style.fontSize = '32px');
    await page.getByLabel('Project section', { exact: true }).selectOption('design-result');
    assert.equal(new URL(page.url()).hash, '#design-result');
    await fits(page, '200% section navigation 320');
});
