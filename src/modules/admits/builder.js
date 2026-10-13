/* ============================================================================
   ADMITS module · BUILDER
   The only place where the five VIPER parts are wired together.
   ========================================================================== */
const AdmitsModule = (function () {
  const root = document.getElementById('s-admits');
  if (!root) return null;
  const gateway = { load: () => JSON.parse(JSON.stringify(ADMITS_DATA)) };
  const interactor = AdmitsInteractor(gateway, AdmitsEntity);
  const router = AdmitsRouter(Router);
  const presenter = AdmitsPresenter(interactor, router);
  const view = AdmitsView(root, {
    Chart: window.Chart, css, tr: s => I18N.tr(s), chartCfg: cfg => I18N.chart(cfg)
  });
  presenter.attach(view);
  const api = { name: 'admits', presenter, refresh: () => presenter.refresh(), show: router.show };
  App.register(api);
  Router.register('admits', 's-admits');
  return api;
})();
