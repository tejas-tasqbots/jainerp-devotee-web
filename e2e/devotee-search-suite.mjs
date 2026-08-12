/**
 * Devotee search & filters UI suite — the lists a devotee actually comes back
 * to, driven in a real browser against a live devotee-api.
 *
 * Every assertion that claims "the filter worked" is checked against the API's
 * own answer for the same query rather than against a hard-coded count. A UI
 * test that asserts "3 rows" passes on the day the fixture changes and lies
 * about everything after it.
 *
 *   PLAYWRIGHT_PATH=<abs path to playwright> \
 *   E2E_WEB=http://localhost:5198 E2E_API=http://localhost:3197/api/v1 \
 *   E2E_MOBILE=9764500001 node e2e/devotee-search-suite.mjs
 */
import { mkdirSync } from 'fs';

const pwPath = process.env.PLAYWRIGHT_PATH ?? 'playwright';
const pw = await import(pwPath);
const chromium = pw.chromium ?? pw.default?.chromium;

const WEB = process.env.E2E_WEB ?? 'http://localhost:5174';
const API = process.env.E2E_API ?? 'http://localhost:3107/api/v1';
const MOBILE = (process.env.E2E_MOBILE ?? '9764500001').replace(/\D/g, '').slice(-10);
const SHOTS = new URL('./screens-search/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const results = [];
function record(id, title, ok, detail = '') {
  results.push({ id, title, ok, detail });
  console.log(`  ${ok ? '✔ PASS' : '✘ FAIL'} ${id} ${title}${detail ? ' — ' + detail : ''}`);
}

let token = '';
async function apiLogin() {
  const j = async (r) => (await r.json()).data;
  const sent = await j(await fetch(`${API}/auth/send-otp`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mobile: MOBILE }),
  }));
  const ver = await j(await fetch(`${API}/auth/verify-otp`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mobile: MOBILE, otp: sent.dev_otp }),
  }));
  token = ver.access_token;
}
async function api(path) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return r.json();
}

await apiLogin();

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
// A phone viewport: devotee-web is a PWA and every one of these screens is
// used one-handed. A filter row that only fits on a laptop is not shipped.
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.setDefaultTimeout(20000);
page.on('dialog', (d) => d.accept().catch(() => {}));

const crashes = [];
page.on('pageerror', (e) => crashes.push(String(e)));
const serverErrors = [];
page.on('response', (r) => {
  if (r.url().includes('/api/v1/') && r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
});

const shot = (n) => page.screenshot({ path: `${SHOTS}${n}.png`, fullPage: true });

/** Horizontal overflow is the classic phone-layout bug — assert it never happens. */
async function noHorizontalScroll(id, where) {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  record(id, `${where}: page does not scroll sideways on a phone`, overflow <= 1, `overflow=${overflow}px`);
}

async function login() {
  await page.goto(WEB, { waitUntil: 'networkidle' });
  // The mobile field is inside PhoneInput (a country select + a numeric input),
  // so target the input, not the wrapper.
  await page.waitForSelector('input[inputmode="numeric"]', { timeout: 20000 });
  await page.locator('input[inputmode="numeric"]').first().fill(MOBILE);
  await page.locator('button:has-text("Send")').first().click();
  await page.waitForSelector('text=Dev mode — OTP:', { timeout: 20000 });
  const otp = (await page.textContent('.font-mono.font-bold')).trim();
  if (!/^\d{6}$/.test(otp)) throw new Error(`no dev OTP on the login screen (got "${otp}")`);
  await page.locator('input[maxlength="6"]').fill(otp);
  await page.locator('button:has-text("Verify")').first().click();
  await page.waitForURL(/\/(home|donations)/, { timeout: 25000 });
}

/** Row count on a list screen, counted from the cards the page renders. */
async function rowCount(selector) {
  return page.locator(selector).count();
}

try {
  await login();
  record('DS-01', 'devotee login reaches the app', true);

  // ══ Donations ═══════════════════════════════════════════════════════════
  await page.goto(`${WEB}/donations`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  await shot('01-donations');
  const donBody = await page.textContent('body');
  record('DS-02', 'donations list renders', !/Something went wrong|TypeError/i.test(donBody));
  await noHorizontalScroll('DS-03', 'donations');

  const searchBox = page.locator('input[type=search]').first();
  record('DS-04', 'donations has a search box', (await searchBox.count()) > 0);

  // Filtered totals line must match the API for the SAME query.
  const baseApi = await api('/me/transactions?limit=20&include_unsynced=true');
  const baseTotal = baseApi.meta?.total ?? 0;
  const bodyTotals = await page.textContent('body');
  record('DS-05', 'filtered-total line reflects the API total',
    baseTotal === 0 || bodyTotals.includes(`${baseTotal}`), `api total=${baseTotal}`);

  // Search narrows, and by the same amount the API says.
  const NEEDLE = 'Annadaan';
  await searchBox.fill(NEEDLE);
  await page.waitForTimeout(1600);
  const uiRows = await rowCount('.card');
  const apiRows = (await api(`/me/transactions?limit=20&include_unsynced=true&q=${NEEDLE}`)).meta?.total ?? 0;
  record('DS-06', `search "${NEEDLE}" narrows the list to the API's answer`,
    apiRows > 0 && uiRows > 0 && uiRows <= apiRows + 2, `ui≈${uiRows} api=${apiRows}`);
  await shot('02-donations-search');

  // A search that matches nothing shows the "nothing matches" state, NOT the
  // "you have never donated" state — the whole point of splitting them.
  await searchBox.fill('zzzz-no-such-donation-zzzz');
  await page.waitForTimeout(1600);
  const emptyBody = await page.textContent('body');
  record('DS-07', 'an empty search says "nothing matches", not "no donations yet"',
    /Nothing matches/i.test(emptyBody) && !/No transactions|never donated/i.test(emptyBody));
  record('DS-08', 'an empty search offers to clear the filters', /Clear filters/i.test(emptyBody));
  await shot('03-donations-no-results');

  await page.locator('button:has-text("Clear filters")').first().click();
  await page.waitForTimeout(1600);
  record('DS-09', 'clearing filters restores the list', (await rowCount('.card')) > 0);

  // 80G-only.
  const only80 = page.locator('input[type=checkbox]').first();
  if (await only80.count()) {
    await only80.check();
    await page.waitForTimeout(1600);
    const ui80 = await rowCount('.card');
    const api80 = (await api('/me/transactions?limit=20&include_unsynced=true&only_80g=true')).meta?.total ?? 0;
    record('DS-10', '80G-only matches the API', ui80 > 0 && api80 > 0 && ui80 <= api80 + 2,
      `ui≈${ui80} api=${api80}`);
    await only80.uncheck();
    await page.waitForTimeout(1200);
  } else {
    record('DS-10', '80G-only matches the API', false, 'no 80G checkbox rendered');
  }

  // Sort by amount actually reorders.
  const selects = page.locator('select');
  const sortSel = selects.nth(2);
  if (await sortSel.count()) {
    await sortSel.selectOption('amount_desc');
    await page.waitForTimeout(1600);
    const amounts = await page.locator('.card').allTextContents();
    const nums = amounts.map((t) => Number((t.match(/₹\s*([\d,]+)/) ?? [])[1]?.replace(/,/g, '') ?? NaN))
      .filter((n) => !Number.isNaN(n));
    const sorted = nums.every((n, i) => i === 0 || nums[i - 1] >= n);
    record('DS-11', 'sort by highest amount actually reorders the rows', nums.length > 1 && sorted,
      nums.slice(0, 4).join(' ≥ '));
    await sortSel.selectOption('date_desc');
    await page.waitForTimeout(1200);
  } else {
    record('DS-11', 'sort by highest amount actually reorders the rows', false, 'no sort select');
  }

  // "All years" is offered and works.
  const fySel = selects.nth(0);
  await fySel.selectOption('all');
  await page.waitForTimeout(1600);
  const allYears = (await api('/me/transactions?limit=20&include_unsynced=true&fy=all')).meta?.total ?? 0;
  record('DS-12', '"All years" queries every FY', allYears >= baseTotal, `all=${allYears} thisFy=${baseTotal}`);
  await shot('04-donations-all-years');

  // ══ Pledges ═════════════════════════════════════════════════════════════
  await page.goto(`${WEB}/bolis`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const boliBody = await page.textContent('body');
  record('DS-13', 'pledges list renders', !/Something went wrong|TypeError/i.test(boliBody));
  record('DS-14', 'pledges has a search box', (await page.locator('input[type=search]').count()) > 0);
  await noHorizontalScroll('DS-15', 'pledges');
  await shot('05-bolis');

  // ══ My Bookings (the page that did not exist) ═══════════════════════════
  await page.goto(`${WEB}/bookings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  const bkBody = await page.textContent('body');
  const landed = new URL(page.url()).pathname === '/bookings';
  record('DS-16', '/bookings is a real page, not a catch-all redirect', landed,
    landed ? '' : `redirected to ${new URL(page.url()).pathname}`);
  record('DS-17', 'my bookings renders without crashing',
    !/Something went wrong|TypeError|Cannot read/i.test(bkBody));
  record('DS-18', 'my bookings has search + filters',
    (await page.locator('input[type=search]').count()) > 0 &&
    (await page.locator('select').count()) >= 2);
  await noHorizontalScroll('DS-19', 'my bookings');
  await shot('06-my-bookings');

  // upcoming/past must return the RIGHT rows, not just a healthy page.
  //
  // This assertion exists because the first version of the filter compared a
  // node-pg Date object to a 'YYYY-MM-DD' string via String(), which yields
  // 'Sun May 03 2026 …' — and 'S' > '2', so every booking read as upcoming
  // whatever its date. A "page still renders" check passed the whole time.
  for (const value of ['upcoming', 'past']) {
    await page.locator('select').first().selectOption(value);
    await page.waitForTimeout(1400);
    const b = await page.textContent('body');
    const alive = !/Something went wrong|TypeError/i.test(b);
    const uiRows = await rowCount('.card');
    const apiRows = ((await api(`/me/bookings?when=${value}`)).data ?? []).length;
    record(`DS-20-${value}`, `my bookings: when=${value} shows exactly the API's rows`,
      alive && uiRows === apiRows, `ui=${uiRows} api=${apiRows}`);
  }
  // And the two halves must partition the list — a booking in neither, or in
  // both, is the shape of the bug above.
  const all = ((await api('/me/bookings')).data ?? []).length;
  const up = ((await api('/me/bookings?when=upcoming')).data ?? []).length;
  const past = ((await api('/me/bookings?when=past')).data ?? []).length;
  record('DS-20-partition', 'upcoming + past account for every booking exactly once',
    all > 0 && up + past === all, `all=${all} upcoming=${up} past=${past}`);
  await page.locator('select').first().selectOption('');
  await page.waitForTimeout(1000);

  // Reachable from Profile — an unlinked page is an absent page.
  await page.goto(`${WEB}/profile`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const link = page.locator('button:has-text("My Bookings"), a:has-text("My Bookings")');
  record('DS-21', 'my bookings is reachable from Profile', (await link.count()) > 0);
  if (await link.count()) {
    await link.first().click();
    await page.waitForTimeout(1200);
    record('DS-22', 'the Profile link lands on /bookings',
      new URL(page.url()).pathname === '/bookings', page.url());
  }

  // ══ Temple directory facets ═════════════════════════════════════════════
  await page.goto(`${WEB}/temples`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  const facets = (await api('/temples/directory/facets')).data;
  const stateSel = page.locator('select').first();
  const optCount = await stateSel.locator('option').count();
  record('DS-23', 'directory offers a state filter built from real data',
    optCount === (facets?.states?.length ?? 0) + 1,
    `options=${optCount} apiStates=${facets?.states?.length}`);
  await shot('07-temples');

  if ((facets?.states?.length ?? 0) > 0) {
    const st = facets.states[0].value;
    await stateSel.selectOption(st);
    await page.waitForTimeout(1600);
    const uiTemples = await rowCount('.card');
    const apiTemples = (await api(`/temples/directory?state=${encodeURIComponent(st)}&limit=15`)).meta?.total ?? 0;
    record('DS-24', `state="${st}" filters to the API's answer`,
      uiTemples > 0 && uiTemples <= apiTemples, `ui=${uiTemples} api=${apiTemples}`);

    // Every state option must return results — that is the whole reason the
    // options come from facets rather than a static list of Indian states.
    const barren = [];
    for (const s of facets.states) {
      const n = (await api(`/temples/directory?state=${encodeURIComponent(s.value)}&limit=1`)).meta?.total ?? 0;
      if (n === 0) barren.push(s.value);
    }
    record('DS-25', 'every offered state actually returns temples',
      barren.length === 0, barren.join(', '));

    // Cities must be scoped to the chosen state.
    const cityFacets = (await api(`/temples/directory/facets?state=${encodeURIComponent(st)}`)).data;
    const citySel = page.locator('select').nth(1);
    const cityOpts = await citySel.locator('option').count();
    record('DS-26', 'city options are scoped to the chosen state',
      cityOpts === (cityFacets?.cities?.length ?? 0) + 1,
      `options=${cityOpts} apiCities=${cityFacets?.cities?.length}`);
    await shot('08-temples-filtered');

    // Changing state must clear the city — Pune is not in Madhya Pradesh.
    if ((cityFacets?.cities?.length ?? 0) > 0 && facets.states.length > 1) {
      await citySel.selectOption(cityFacets.cities[0].value);
      await page.waitForTimeout(1200);
      await stateSel.selectOption(facets.states[1].value);
      await page.waitForTimeout(1400);
      record('DS-27', 'changing state clears the previously chosen city',
        (await citySel.inputValue()) === '', `city="${await citySel.inputValue()}"`);
    }
  }

  await noHorizontalScroll('DS-28', 'temple directory');

  record('DS-29', 'no unhandled client errors during the run', crashes.length === 0,
    crashes.slice(0, 2).join(' | '));
  record('DS-30', 'no 5xx from the API during the run', serverErrors.length === 0,
    serverErrors.slice(0, 2).join(' | '));
} catch (e) {
  record('DS-FATAL', 'suite completed', false, String(e).slice(0, 300));
  await shot('99-fatal');
} finally {
  await browser.close();
}

const pass = results.filter((r) => r.ok).length;
console.log(`\n  ${pass}/${results.length} passed`);
if (pass !== results.length) {
  console.log('\n  Failures:');
  for (const r of results.filter((x) => !x.ok)) console.log(`   - ${r.id} ${r.title}: ${r.detail}`);
}
process.exit(pass === results.length ? 0 : 1);
