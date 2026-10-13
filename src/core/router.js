/* ============================================================================
   CORE · Router
   One place for navigation: scrolling to a section, deep links (#admits) and
   opening the legacy site sheet. Modules call this instead of touching each
   other's DOM.
   ========================================================================== */
const Router = (function () {
  const routes = {};
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    /** Make `#key` in the address bar scroll to a section. */
    register(key, sectionId) { routes[key] = sectionId; },
    scrollTo(id) {
      if (typeof Pager !== 'undefined' && Pager.has(id)) { Pager.show(id); return; }   // pages are shown, not scrolled to
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    },
    /** The daily-file name of a site by its number, or null when the site has no daily readings. */
    dailySiteName(no) {
      const s = (DATA.sites || []).find(x => parseInt(x.n, 10) === no);
      return s ? s.n : null;
    },
    /** Opens the site detail sheet with its daily chart (legacy screen). */
    openSite(name) { openSite(name); },
    start() {
      const key = location.hash.replace('#', '');
      if (routes[key]) setTimeout(() => this.scrollTo(routes[key]), 400);
    }
  };
})();
