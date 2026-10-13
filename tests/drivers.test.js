const test = require('node:test'), assert = require('node:assert');
const E = require('../src/modules/drivers/entity.js'), I = require('../src/modules/drivers/interactor.js'), P = require('../src/modules/drivers/presenter.js');
const DD = require('../src/modules/drivers/data.js'), AD = require('../src/modules/admits/data.js');
const adm = (AD.ADMITS_DATA || AD).sites;
const load = () => { const d = JSON.parse(JSON.stringify(DD)); d.sites.forEach(s => { const a = adm.find(x => x.no === s.no); if (a) { s.a25 = a.a25; s.a26 = a.a26; s.flag = a.flag; s.note = a.note; } }); return d; };
const mk = (meters, extra) => E.site(Object.assign({ no: 1, name: 'X', meters }, extra));
const near = (a, b, t) => assert.ok(Math.abs(a - b) <= (t == null ? 0.5 : t), a + ' vs ' + b);

test('entity: category is read from the meters', () => {
  assert.strictEqual(E.category(mk([{ t: 'WBP', ct: 1, k25: 0, k26: 500 }])), 'new');
  assert.strictEqual(E.category(mk([{ t: 'LWBP', ct: 120, k25: 1000, k26: 0 }, { t: 'LWBP', ct: 1, k25: 0, k26: 900 }])), 'basis');
  assert.strictEqual(E.category(mk([{ t: 'LWBP', ct: 80, k25: 1000, k26: 1000 }, { t: 'LWBP', ct: 50, k25: 0, k26: 400 }])), 'extra');
  assert.strictEqual(E.category(mk([{ t: 'LWBP', ct: 1, k25: 600, k26: 600 }, { t: 'WBP', ct: 1, k25: 400, k26: 0 }])), 'incomplete');
  assert.strictEqual(E.category(mk([{ t: 'LWBP', ct: 1, k25: 1000, k26: 1100 }, { t: 'WBP', ct: 1, k25: 0, k26: 20 }])), 'like', 'a 2% meter is noise');
});

test('entity: zero meters are dropped and gaps need a 15% margin', () => {
  const s = mk([{ t: 'WBP', ct: 1, k25: 0, k26: 0 }, { t: 'LWBP', ct: 1, k25: 100, k26: 100 }], { daily26: 114 });
  assert.strictEqual(s.meters.length, 1);
  assert.strictEqual(E.dailyGap(s), null);
  assert.ok(E.dailyGap(mk([{ t: 'LWBP', ct: 1, k25: 100, k26: 100 }], { daily26: 120 })) > 1.15);
});

test('entity: regression helpers', () => {
  const f = E.ols([0, 1, 2, 3], [1, 3, 5, 7]);
  near(f.slope, 2, 1e-9); near(f.r2, 1, 1e-9); near(E.theilSen([0, 1, 2, 3], [1, 3, 5, 7]), 2, 1e-9);
  assert.strictEqual(E.median([3, 1, 2]), 2);
});

const it = () => I({ load }, E);

test('interactor: the bridge adds up exactly', () => {
  const b = it().bridge();
  near(b.start, 1934182.7, 1); near(b.end, 2067675.3, 1); near(b.net, 133492.6, 1);
  near(b.steps.reduce((t, s) => t + s.delta, 0), b.net, 1e-6);
  const by = k => b.steps.find(s => s.key === k);
  near(by('new').delta, 116046.1); assert.strictEqual(by('new').n, 4);
  near(by('basis').delta, -21877); near(by('extra').delta, 11035.6); near(by('incomplete').delta, -15821.3);
  assert.strictEqual(by('like').n, 50); near(by('like').delta, 44109.2);
});

test('interactor: clean like-for-like', () => {
  const c = it().clean(30);
  assert.strictEqual(c.sites, 52);
  near(c.kChg, 0.0283, 0.0005); near(c.aChg, -0.0811, 0.0005); near(c.i26, 2.718, 0.001);
  near(c.perDay, 0.0545, 0.001); near(c.d25, 30.76, 0.01);
  assert.ok(it().clean(31).perDay < c.perDay, 'a longer assumed month lowers the per-day change');
});

test('interactor: admits explain little of the kWh change', () => {
  const e = it().elasticity();
  assert.ok(e.slope > 0.05 && e.slope < 0.2 && e.r2 < 0.3);
  assert.ok(e.fixedShare > 0.8);
  assert.ok(e.thirds[0].aChg < -0.2 && e.thirds[0].kChg > -0.1, 'sites where admits fell most barely saved any kWh');
  assert.ok(e.thirds[2].aChg > 0.3 && e.thirds[2].kChg > 0.05);
});

test('interactor: concentration and invoice gaps', () => {
  const c = it().concentration(5);
  assert.strictEqual(c.sites, 50); assert.strictEqual(c.up, 23); assert.strictEqual(c.down, 27);
  assert.ok(c.medianPct < 0);
  assert.strictEqual(c.top[0].site.name, 'SENAYAN PARK'); near(c.topUp, 53608.3, 1);
  const g = it().gaps();
  assert.deepStrictEqual(g.rows.map(r => r.site.name).sort(), ['LIPPO PLAZA JOGJA', 'MALANG TOWN SQUARE', 'MALL OF SERANG', 'MAL BOTANIA 2'].sort());
  near(g.missing, 59647.4, 1);
});

test('presenter: state, view model and verify list', () => {
  let last = null;
  const view = { bind() {}, render(vm) { last = vm; } };
  const p = P(it(), { hasDaily: () => false, openDaily() {} }); p.attach(view);
  assert.strictEqual(last.detail.title, 'New sites'); assert.strictEqual(last.detail.rows.length, 4);
  p.onStep('like'); assert.strictEqual(last.detail.rows.length, 8); assert.ok(last.detail.more);
  p.onToggleMore(); assert.strictEqual(last.detail.rows.length, 50);
  p.onStep('like'); assert.strictEqual(last.steps.find(s => s.key === 'like').active, true, 'selecting twice keeps it selected');
  assert.strictEqual(last.detail.rows.length, 8, 'changing step collapses the list');
  p.onDays(31); assert.strictEqual(last.clean.days.find(d => d.v === 31).active, true);
  p.onStep('nope'); assert.strictEqual(last.detail.title, 'Same-meter sites');
  const names = last.verify.items.map(i => i.site);
  ['LIPPO PLAZA KENDARI', 'LIPPO PLAZA JOGJA', 'LIPPO PLAZA SIDOARJO', 'SENAYAN PARK', 'MALL OF SERANG'].forEach(n => assert.ok(names.includes(n), n));
  assert.ok(!names.includes('PLAZA MEDAN FAIR'), 'a real CT change is not a doubt');
  assert.match(last.headline.lead, /87% of the net rise comes from 4 new sites/);
  assert.deepStrictEqual(last.bridge.bars.map(b => b.key), ['new', 'basis', 'extra', 'incomplete', 'like', 'net']);
  const lastBar = last.bridge.bars[5]; near(lastBar.to, 133492.6, 1);
});
