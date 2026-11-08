import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createJiti } from 'jiti';
import { fileURLToPath } from 'node:url';
const jiti = createJiti(import.meta.url, { alias: { '@': fileURLToPath(new URL('../', import.meta.url)) } });
const { validateScan, validateExport } = await jiti.import('../lib/validation.ts');
const { buildOverpassTagFilters } = await jiti.import('../lib/categories.ts');
const { leadsToCsv, leadsToXlsxBuffer } = await jiti.import('../lib/export.ts');
const { rateLimit, readJson } = await jiti.import('../lib/api.ts');
const { POST: scan } = await jiti.import('../app/api/scan/route.ts');
const { POST: exportRoute } = await jiti.import('../app/api/export/route.ts');
const { overpassProvider } = await jiti.import('../lib/providers/overpass.ts');
const { getScanProvider } = await jiti.import('../lib/providers/index.ts');
const { getCached, setCached } = await jiti.import('../lib/cache.ts');
const { default: ExcelJS } = await jiti.import('exceljs');
const valid = { category: 'plumbers', mode: 'radius', center: { lat: 40, lng: -74 }, radiusMiles: 10 };
const lead = { id: 'test', name: 'Example', phone: '+1 555 0100', city: 'City', address: 'Road', rating: 'N/A', reviewCount: null, lat: 40, lng: -74, mapsUrl: 'https://www.openstreetmap.org/node/1', category: 'plumbers', source: 'overpass' };
const request = (body) => new Request('http://localhost/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('scan validation rejects malformed shapes and unbounded workloads', () => {
  for (const body of [null, [], { ...valid, category: 123 }, { ...valid, mode: 'other' }, { ...valid, radiusMiles: -1 }, { ...valid, radiusMiles: 51 }, { ...valid, center: { lat: 91, lng: 0 } }, { ...valid, center: { lat: 0, lng: Infinity } }, { ...valid, useMock: 'true' }, { category: 'x', mode: 'multi', zones: Array(6).fill({ lat: 0, lng: 0, radiusMiles: 5 }) }, { category: 'x', mode: 'state', stateCode: 'ZZ' }]) assert.throws(() => validateScan(body));
  assert.equal(validateScan(valid).mode, 'radius');
  assert.equal(validateScan({ category: 'dentists', mode: 'state', stateCode: 'tx' }).stateCode, 'TX');
});
test('custom categories escape query delimiters and regex operators', () => {
  const [filter] = buildOverpassTagFilters('a.*"\\test');
  assert.equal(filter, '["name"~"a\\\\.\\\\*\\"\\\\\\\\test",i]');
});
test('CSV neutralizes formulas, preserves numeric coordinates, and quotes carriage returns', () => {
  for (const value of ['=1+1', '+SUM(1)', '-1+1', '@SUM(1)', '  =1+1', '\t=1+1']) assert.ok(leadsToCsv([{ ...lead, name: value }]).includes(`'${value}`));
  assert.ok(leadsToCsv([{ ...lead, name: 'a\rb' }]).includes('"a\rb"'));
  assert.ok(leadsToCsv([lead]).includes(',40,-74,'));
});
test('XLSX exports untrusted content as a string rather than a formula', async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await leadsToXlsxBuffer([{ ...lead, name: '=1+1' }]));
  const cell = workbook.getWorksheet('Leads').getCell('A2');
  assert.equal(cell.value, '=1+1');
  assert.equal(cell.type, ExcelJS.ValueType.String);
});
test('export validation rejects invalid formats, unsafe links and excessive rows', () => {
  for (const body of [{ format: 'exe', leads: [lead] }, { format: 'csv', leads: [null] }, { format: 'csv', leads: Array(501).fill(lead) }, { format: 'csv', leads: [{ ...lead, mapsUrl: 'javascript:alert(1)' }] }]) assert.throws(() => validateExport(body));
  assert.equal(validateExport({ format: 'csv', leads: [lead] }).leads.length, 1);
});
test('rate budget resets after the window', () => {
  assert.equal(rateLimit('unit', 1, 100), true);
  assert.equal(rateLimit('unit', 1, 101), false);
  assert.equal(rateLimit('unit', 1, 60100), true);
});
test('body reader rejects malformed JSON and oversized streamed bodies', async () => {
  await assert.rejects(readJson(new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }), 100), /Invalid JSON/);
  await assert.rejects(readJson(request(valid), 5), /too large/);
});
test('scan API rejects bad input and returns explicit demo data', async () => {
  assert.equal((await scan(request(null))).status, 400);
  const response = await scan(request({ ...valid, useMock: true }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.provider, 'mock');
  assert.ok(body.leads.length > 0);
  assert.ok(body.leads.every(lead => lead.source === 'mock'));
});
test('live upstream failure returns an error without fabricated leads', async () => {
  const original = overpassProvider.scan;
  const provider = process.env.DATA_PROVIDER;
  process.env.DATA_PROVIDER = 'overpass';
  overpassProvider.scan = async () => { throw new Error('upstream failure'); };
  try {
    const response = await scan(request(valid));
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.leads, undefined);
    assert.ok(!body.error.includes('upstream failure'));
  } finally { overpassProvider.scan = original; if (provider === undefined) delete process.env.DATA_PROVIDER; else process.env.DATA_PROVIDER = provider; }
});
test('cross-origin requests are rejected', async () => {
  const req = request(valid);
  req.headers.set('origin', 'https://untrusted.example');
  assert.equal((await scan(req)).status, 403);
});
test('export route produces CSV and rejects unsupported formats', async () => {
  const response = await exportRoute(request({ format: 'csv', leads: [lead] }));
  assert.equal(response.status, 200);
  assert.ok((await response.text()).startsWith('Name,Phone'));
  assert.equal((await exportRoute(request({ format: 'exe', leads: [lead] }))).status, 400);
});
test('paid provider requires an explicit opt-in', () => {
  const old = process.env.DATA_PROVIDER; const enabled = process.env.ENABLE_PAID_PROVIDER;
  process.env.DATA_PROVIDER = 'google'; delete process.env.ENABLE_PAID_PROVIDER;
  try { assert.throws(() => getScanProvider(), /disabled/); }
  finally { if (old === undefined) delete process.env.DATA_PROVIDER; else process.env.DATA_PROVIDER = old; if (enabled === undefined) delete process.env.ENABLE_PAID_PROVIDER; else process.env.ENABLE_PAID_PROVIDER = enabled; }
});
test('cache evicts old entries to stay bounded', () => {
  for (let i = 0; i < 251; i++) setCached(`bounded-${i}`, i);
  assert.equal(getCached('bounded-0'), null);
  assert.equal(getCached('bounded-250'), 250);
});

 test('same-origin requests work when Next uses an internal request URL', async () => {
  const req = request({ ...valid, useMock: true });
  req.headers.set('host', 'portfolio.example');
  req.headers.set('origin', 'https://portfolio.example');
  assert.equal((await scan(req)).status, 200);
});
 test('canceled scans do not start an upstream request', async () => {
  const fetchOriginal = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('should not run'); };
  try {
    await assert.rejects(overpassProvider.scan({ ...valid, category: 'unique-cancel-test' }, AbortSignal.abort()));
    assert.equal(calls, 0);
  } finally { globalThis.fetch = fetchOriginal; }
});

test('multi-zone Overpass scans every area and deduplicates overlapping businesses', async () => {
  const original = globalThis.fetch;
  const queries = [];
  const element = (id, phone) => ({ type: 'node', id, lat: 37, lon: -110, tags: { name: `Plumber ${id}`, craft: 'plumber', phone } });
  globalThis.fetch = async (_url, options) => {
    queries.push(new URLSearchParams(options.body).get('data'));
    const index = queries.length;
    return Response.json({ elements: [element(index * 10, '+1 555 1111'), element(index, `+1 555 222${index}`)] });
  };
  try {
    const result = await overpassProvider.scan({ category: 'plumbers', mode: 'multi', zones: [{ lat: 37.123, lng: -110.123, radiusMiles: 5 }, { lat: 38.234, lng: -111.234, radiusMiles: 25 }] });
    assert.equal(queries.length, 2);
    assert.ok(queries[0].includes('around:8047,37.123,-110.123'));
    assert.ok(queries[1].includes('around:40234,38.234,-111.234'));
    assert.equal(result.leads.length, 3);
    assert.equal(new Set(result.leads.map(lead => lead.phone)).size, 3);
    assert.equal(result.scanned, 4);
  } finally { globalThis.fetch = original; }
});

test('multi-zone demo scans do not return duplicate IDs for overlapping areas', async () => {
  const { mockProvider } = await jiti.import('../lib/providers/mock.ts');
  const zone = { lat: 30, lng: -90, radiusMiles: 10 };
  const result = await mockProvider.scan({ category: 'plumbers', mode: 'multi', zones: [zone, zone] });
  assert.equal(new Set(result.leads.map(lead => lead.id)).size, result.leads.length);
});

test('Google multi-zone scans each center and deduplicates shared businesses', async () => {
  const { GooglePlacesProvider } = await jiti.import('../lib/providers/googlePlaces.ts');
  const original = globalThis.fetch;
  const centers = [];
  const detailIds = [];
  globalThis.fetch = async value => {
    const url = new URL(value);
    if (url.pathname.includes('nearbysearch')) {
      centers.push(url.searchParams.get('location'));
      return Response.json({ status: 'OK', results: [{ place_id: 'shared', name: 'Shared' }, { place_id: `unique-${centers.length}`, name: 'Unique' }] });
    }
    const id = url.searchParams.get('place_id');
    detailIds.push(id);
    return Response.json({ status: 'OK', result: { name: id, formatted_phone_number: id === 'shared' ? '+15550000111' : `+1555000022${id.slice(-1)}`, geometry: { location: { lat: 40, lng: -74 } } } });
  };
  try {
    const result = await new GooglePlacesProvider('test-key').scan({ category: 'plumbers', mode: 'multi', zones: [{ lat: 40, lng: -74, radiusMiles: 5 }, { lat: 41, lng: -75, radiusMiles: 10 }] });
    assert.deepEqual(centers, ['40,-74', '41,-75']);
    assert.equal(detailIds.length, 4);
    assert.equal(result.leads.length, 3);
    assert.equal(result.scanned, 4);
  } finally { globalThis.fetch = original; }
});

test('a later live zone failure is reported rather than returning a misleading complete scan', async () => {
  const original = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () => {
    count++;
    if (count === 1) return Response.json({ elements: [] });
    return new Response('Unavailable', { status: 503 });
  };
  try {
    await assert.rejects(overpassProvider.scan({ category: 'plumbers', mode: 'multi', zones: [{ lat: 33.765, lng: -80.765, radiusMiles: 5 }, { lat: 34.876, lng: -81.876, radiusMiles: 5 }] }), /Overpass error 503/);
    assert.equal(count, 3);
  } finally { globalThis.fetch = original; }
});
