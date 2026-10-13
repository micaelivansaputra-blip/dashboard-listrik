/* ============================================================================
   CORE · App
   Registry for self-contained VIPER modules. The legacy render() calls
   App.refresh() so modules redraw on theme, language and data changes.
   ========================================================================== */
const App = (function () {
  const modules = [];
  return {
    register(m) { modules.push(m); return m; },
    refresh() { modules.forEach(m => { try { m.refresh && m.refresh(); } catch (e) { console.error('[module ' + (m.name || '?') + ']', e); } }); },
    modules: () => modules.slice()
  };
})();
