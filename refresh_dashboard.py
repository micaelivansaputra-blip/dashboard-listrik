#!/usr/bin/env python3
"""Refresh the dashboard from the online Google Sheet. Run: python refresh_dashboard.py [--push]
Needs only Python 3. The sheet must be shared as 'Anyone with the link can view'."""
import csv,io,json,subprocess,sys,tempfile,urllib.request,urllib.error,pathlib,datetime,webbrowser
ROOT=pathlib.Path(__file__).resolve().parent
SOURCES=[("1RCsNRGMxxEao6zSW8O5idEXTR4esWjaGs20mUUNYxHc","RAW SUMMARY")]  # (spreadsheet id, tab) - add more here
def fetch(sid,tab):
    url=f"https://docs.google.com/spreadsheets/d/{sid}/gviz/tq?tqx=out:csv&headers=0&sheet="+urllib.parse.quote(tab)
    try:raw=urllib.request.urlopen(url,timeout=120).read().decode('utf-8')
    except urllib.error.HTTPError as e:sys.exit(f"Cannot read sheet ({e.code}). Share it as 'Anyone with the link can view'.")
    if raw.lstrip().lower().startswith('<'):sys.exit("Sheet is private (got a login page). Share it as 'Anyone with the link can view'.")
    return list(csv.reader(io.StringIO(raw)))
import urllib.parse
def main():
    rows=fetch(*SOURCES[0])
    tmp=pathlib.Path(tempfile.gettempdir())/'raw_summary.json';tmp.write_text(json.dumps({'values':rows}))
    dp=ROOT/'lean/data/data.json';old=json.load(open(dp)) if dp.exists() else None
    subprocess.run([sys.executable,str(ROOT/'lean/tools/make_data.py'),str(tmp),str(dp)],check=True)
    new=json.load(open(dp));last=new['dates'][-1]
    problems=[]
    if len(new['sites'])!=59:problems.append(f"expected 59 sites, got {len(new['sites'])}")
    if datetime.date.fromisoformat(last)>datetime.date.today():problems.append(f"last date {last} is in the future")
    if old and last<old['dates'][-1]:problems.append(f"last date {last} is older than previous run ({old['dates'][-1]})")
    if problems:
        if old:json.dump(old,open(dp,'w'),separators=(',',':'))
        sys.exit("STOPPED, data not updated: "+"; ".join(problems))
    subprocess.run([sys.executable,str(ROOT/'lean/build.py'),str(ROOT/'index.html')],check=True)
    print(f"OK: {len(new['sites'])} sites, data through {last}")
    if '--push' in sys.argv:
        g=lambda *a:subprocess.run(['git',*a],cwd=ROOT,check=True)
        g('add','lean/data/data.json','index.html')
        if subprocess.run(['git','diff','--cached','--quiet'],cwd=ROOT).returncode:
            g('commit','-m',f'Daily data refresh {datetime.date.today()}');g('push','origin','HEAD:main')
        else:print('No data change, nothing to push.')
    webbrowser.open((ROOT/'index.html').as_uri())
main()
