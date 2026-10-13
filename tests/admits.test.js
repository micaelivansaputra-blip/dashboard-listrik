/* Run: node --test tests/   (Node 18+, no dependencies)
   The Entity, Interactor and Presenter layers are plain JavaScript, so they are tested here without a browser. */
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/modules/admits/entity.js');
const Interactor = require('../src/modules/admits/interactor.js');
const Presenter = require('../src/modules/admits/presenter.js');
const DATA = require('../src/modules/admits/data.js');

const gateway = { load: () => JSON.parse(JSON.stringify(DATA)) };
const near = (a, b, eps = 0.001) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

test('entity: change and intensity never divide by zero or null', () => {
  assert.equal(E.change(0, 5), null);
  assert.equal(E.change(null, 5), null);
  near(E.change(100, 90), -0.1);
  assert.equal(E.intensity(10, 0), null);
  near(E.intensity(300, 100), 3);
});

test('entity: quadrant honours the threshold', () => {
  assert.equal(E.quadrant(-0.2, 0.1, 0), 'concern');
  assert.equal(E.quadrant(-0.2, -0.1, 0), 'both-down');
  assert.equal(E.quadrant(0.2, 0.1, 0), 'both-up');
  assert.equal(E.quadrant(0.2, -0.1, 0), 'saving');
  assert.equal(E.quadrant(-0.2, 0.01, 0.02), 'steady');
  assert.equal(E.quadrant(null, 0.1, 0), null);
});

test('entity: status explains why a site is not compared', () => {
  const s = o => E.site(Object.assign({ no: 1, name: 'X', a25: 10, a26: 9, k25: 100, k26: 110 }, o));
  assert.equal(E.status(s({})), 'ok');
  assert.equal(E.status(s({ a25: null })), 'new');
  assert.equal(E.status(s({ k25: null })), 'noinvoice');
  assert.equal(E.status(s({ flag: 'unreliable' })), 'unreliable');
  assert.equal(E.comparable(s({ flag: 'unreliable' }), { excludeUnreliable: true }), false);
  assert.equal(E.comparable(s({ flag: 'unreliable' }), {}), true);
});

test('interactor: headline matches the validated September numbers', () => {
  const I = Interactor(gateway, E), S = I.summary({});
  assert.equal(S.sites, 54);
  assert.equal(S.a25, 785885);
  assert.equal(S.a26, 723874);
  near(S.aChg, -0.0789, 0.0005);
  near(S.kChg, 0.0090, 0.0005);
  near(S.i25, 2.461, 0.001);
  near(S.i26, 2.696, 0.001);
  near(S.iChg, 0.0954, 0.0005);
  assert.equal(S.coverage.total, 59);
  assert.equal(S.coverage.admitsAll26.a26, 778106);
  assert.equal(S.coverage.admitsAll25.a25, 810232);
});

test('interactor: quadrant counts add up and match the analysis', () => {
  const I = Interactor(gateway, E), C = I.counts({});
  assert.deepEqual([C.concern, C['both-down'], C['both-up'], C.saving, C.nodata], [9, 22, 16, 7, 5]);
  assert.equal(C.concern + C['both-down'] + C['both-up'] + C.saving + C.steady + C.nodata, 59);
  near(I.concern({}).reduce((t, r) => t + r.kDelta, 0), 50078.4, 0.5);
});

test('interactor: leaving out unreliable sites drops Kendari only', () => {
  const I = Interactor(gateway, E), S = I.summary({ excludeUnreliable: true });
  assert.equal(S.sites, 53);
  near(S.kChg, 0.0237, 0.0005);
});

test('interactor: list sorts, filters and searches; sites without data sort last', () => {
  const I = Interactor(gateway, E);
  const top = I.list({ sortKey: 'kDelta', sortDir: 'desc' });
  assert.equal(top[0].site.name, 'Senayan Park');
  assert.equal(top[top.length - 1].comparable, false);
  assert.equal(I.list({ filter: 'concern' }).length, 9);
  assert.equal(I.list({ filter: 'nodata' }).length, 5);
  assert.deepEqual(I.list({ query: 'manado' }).map(r => r.site.no), [4]);
  const names = I.list({ sortKey: 'name', sortDir: 'asc' }).map(r => r.site.name);
  assert.deepEqual(names, names.slice().sort((a, b) => a.localeCompare(b)));
});

test('presenter: builds a view model and reacts to view events', () => {
  const I = Interactor(gateway, E);
  const calls = [];
  const router = { hasDaily: no => no === 58, openDaily: no => calls.push(['daily', no]) };
  const P = Presenter(I, router);
  let vm = null, bound = null;
  P.attach({ render: v => { vm = v; }, bind: p => { bound = p; } });
  assert.equal(bound, P);
  assert.equal(vm.verdict.tone, 'up');
  assert.equal(vm.verdict.parts.aVerb, 'fell');
  assert.equal(vm.verdict.parts.kVerb, 'rose');
  assert.equal(vm.verdict.parts.but, 'but');
  assert.equal(vm.verdict.parts.aPct, '7.9%');
  assert.equal(vm.kpis.length, 4);
  assert.equal(vm.kpis[3].value, '9');

  assert.equal(vm.table.rows.length, 12);          // collapsed by default
  assert.equal(vm.table.more.label, 'Show all 59 sites');
  P.onToggleMore(); assert.equal(vm.table.rows.length, 59);
  P.onToggleMore(); assert.equal(vm.table.rows.length, 12);
  P.onFilter('concern');
  assert.equal(vm.table.rows.length, 9);
  assert.equal(vm.table.more, null);
  P.onFilter('concern');                       // second tap clears the filter
  assert.equal(vm.table.rows.length, 12);

  P.onSort('name'); assert.equal(vm.table.columns[0].sorted, 'asc');
  P.onSort('name'); assert.equal(vm.table.columns[0].sorted, 'desc');

  P.onSelect(58);                              // selecting a site expands the list so it is visible
  const open = vm.table.rows.find(r => r.open);
  assert.equal(open.no, 58);
  assert.equal(open.detail.canOpenDaily, true);
  P.onOpenDaily(58); assert.deepEqual(calls, [['daily', 58]]);
  P.onSelect(58); assert.equal(vm.table.rows.some(r => r.open), false);
  P.onPick(58); P.onPick(58); assert.equal(vm.table.rows.filter(r => r.open).length, 1);   // picking twice keeps it open

  P.onExclude(true);
  assert.match(vm.coverage.map(c => c.label).join('|'), /CT changed/);
  P.onThreshold(0.05);
  assert.equal(vm.controls.thresholds.find(t => t.active).v, 0.05);
});

test('presenter: chart points pin outliers to the edge and say so', () => {
  const P = Presenter(Interactor(gateway, E), { hasDaily: () => false, openDaily() {} });
  let vm; P.attach({ render: v => { vm = v; }, bind() {} });
  const sc = vm.scatter, out = sc.points.find(p => p.name === 'Citiplaza Kutabumi');
  assert.ok(out.clipped);
  assert.ok(Math.abs(out.x) <= sc.capX + 1e-9);
  assert.match(out.tip[0], /\+216/);
});
