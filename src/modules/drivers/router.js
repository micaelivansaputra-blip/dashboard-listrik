/* ============================================================================
   DRIVERS module · ROUTER
   Where the module sends the user next, via the app-level Router.
   ========================================================================== */
const DriversRouter = function (core) {
  return {
    hasDaily: no => !!core.dailySiteName(no),
    openDaily(no) { const n = core.dailySiteName(no); if (n) core.openSite(n); },
    show() { core.scrollTo('s-drivers'); }
  };
};
if (typeof module !== 'undefined') module.exports = DriversRouter;
