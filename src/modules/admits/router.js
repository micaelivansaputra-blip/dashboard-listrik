/* ============================================================================
   ADMITS module · ROUTER
   Where the module sends the user next. It talks to the app-level Router, so
   the module never reaches into other screens directly.
   ========================================================================== */
const AdmitsRouter = function (core) {
  return {
    /** True when the daily kWh chart exists for this site (only the 35 sites in the daily file). */
    hasDaily: no => !!core.dailySiteName(no),
    /** Opens the existing site detail sheet with its daily chart. */
    openDaily(no) { const n = core.dailySiteName(no); if (n) core.openSite(n); },
    /** Brings this section into view, e.g. from a link or the hash #admits. */
    show() { core.scrollTo('s-admits'); }
  };
};
if (typeof module !== 'undefined') module.exports = AdmitsRouter;
