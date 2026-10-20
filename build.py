#!/usr/bin/env python3
"""Assemble src/ into a single self-contained index.html (no bundler needed)."""
import json, pathlib, sys
ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
rd = lambda p: (SRC / p).read_text(encoding='utf8')

# Order matters: every file shares one script scope, so a layer may only use layers above it.
APP_FILES = [
    'core/app.js', 'core/router.js', 'core/pager.js', 'core/motion.js', 'core/chrome.js', 'core/buddy.js',
    'legacy/00-state.js', 'legacy/10-mascots.js', 'legacy/20-site-modal.js', 'legacy/30-weekly-zones.js',
    'legacy/40-hero-kpis.js', 'legacy/50-charts.js', 'legacy/60-sites-concern.js',
    'legacy/70-month-to-month.js', 'legacy/75-site-explorer.js',
    'legacy/80-payroll-state.js', 'legacy/81-payroll-mtd.js', 'legacy/82-payroll-calc.js',
    'legacy/83-payroll-cost.js', 'legacy/84-payroll-how.js', 'legacy/85-payroll-render.js',
    'legacy/90-navigation.js', 'legacy/91-controls-theme-lang.js', 'legacy/92-update-excel.js',
    'legacy/93-followups.js', 'legacy/95-concern-export.js',
]
MODULE_FILES = []   # VIPER modules, appended by modules/*/manifest below
for m in sorted((SRC / 'modules').glob('*/manifest.json')):
    man = json.loads(m.read_text())
    MODULE_FILES += [f"modules/{m.parent.name}/{f}" for f in man['files']]
APP_FILES += MODULE_FILES + ['legacy/94-boot.js']

def build():
    css = '\n'.join([rd('styles/legacy.css')] + [p.read_text(encoding='utf8') for p in sorted((SRC / 'styles').glob('mod-*.css'))] + [rd('styles/theme-apple.css'), rd('styles/theme-mh.css')])
    app = '\n'.join(rd(f) for f in APP_FILES)
    i18n = rd('core/i18n.js').replace('/*I18NDICT*/', rd('i18n/dict.json')).replace('/*I18NRULES*/', rd('core/i18n-rules.js.txt'))
    html = rd('index.template.html')
    html = html.replace('/*STYLES*/', '<style>\n' + css + '\n</style>')
    html = html.replace('/*I18NCORE*/', i18n).replace('/*ENGINE*/', rd('core/engine.js')).replace('/*PAYENGINE*/', rd('legacy/payroll-engine.js'))
    html = html.replace('/*APP*/', app).replace('/*DATA*/', rd('data/electricity.json')).replace('/*BUDGET*/', rd('data/budget.json'))
    return html

if __name__ == '__main__':
    out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'index.html'
    html = build(); out.write_text(html, encoding='utf8'); print(out, len(html) // 1024, 'KB')
