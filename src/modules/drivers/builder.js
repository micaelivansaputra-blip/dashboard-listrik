/* ============================================================================
   DRIVERS module · BUILDER
   The only place where the five VIPER parts are wired together.
   The gateway joins the meter-level kWh with admits from the Admits module's data.
   ========================================================================== */
const DriversModule = (function () {
  const root = document.getElementById('s-drivers');
  if (!root) return null;
  const gateway = {
    load() {
      const d = JSON.parse(JSON.stringify(DRIVERS_DATA)), a = {};
      (typeof ADMITS_DATA !== 'undefined' ? ADMITS_DATA.sites : []).forEach(s => { a[s.no] = s; });
      d.sites.forEach(s => { const x = a[s.no]; if (x) { s.a25 = x.a25; s.a26 = x.a26; s.flag = x.flag; s.note = x.note; } });
      return d;
    }
  };
  const interactor = DriversInteractor(gateway, DriversEntity);
  const router = DriversRouter(Router);
  const presenter = DriversPresenter(interactor, router);
  const view = DriversView(root, { Chart: window.Chart, css, tr: s => I18N.tr(s), chartCfg: cfg => I18N.chart(cfg) });
  presenter.attach(view);
  const api = { name: 'drivers', presenter, refresh: () => presenter.refresh(), show: router.show };
  App.register(api);
  Router.register('drivers', 's-drivers');
  return api;
})();
