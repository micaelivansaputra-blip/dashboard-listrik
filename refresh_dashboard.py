#!/usr/bin/env python3
"""Refresh the dashboard from the online Google Sheet. Run: python refresh_dashboard.py [--push]
Needs only Python 3. The sheet must be shared as 'Anyone with the link can view'."""
import os,csv,io,json,subprocess,sys,tempfile,urllib.request,urllib.error,pathlib,datetime,webbrowser
ROOT=pathlib.Path(__file__).resolve().parent
os.environ['PYTHONUTF8']='1'   # Windows: read/write files as UTF-8 (also inherited by the sub-scripts)
SOURCES=[("1RCsNRGMxxEao6zSW8O5idEXTR4esWjaGs20mUUNYxHc","1756437323")]  # (spreadsheet id, tab gid = number after gid= in the tab URL)  # (spreadsheet id, tab) - add more here
def fetch(sid,tab):
    url=f"https://docs.google.com/spreadsheets/d/{sid}/export?format=csv&gid={tab}"
    raw=None;errs=[]
    for attempt in range(3):   # plain Python first (retry: the SSL handshake sometimes drops)
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
            raw=urllib.request.urlopen(req,timeout=120).read().decode('utf-8');break
        except urllib.error.HTTPError as e:sys.exit(f"Cannot read sheet ({e.code}). Share it as 'Anyone with the link can view'.")
        except Exception as e:errs.append(str(e))
    if raw is None:   # fallback: Windows' own curl.exe / system curl (uses the Windows certificate store)
        try:raw=subprocess.run(['curl','-sSL','--max-time','120',url],capture_output=True,check=True).stdout.decode('utf-8')
        except Exception as e:sys.exit("Network error. Python: "+(errs[-1] if errs else '?')+" | curl: "+str(e)+"\nTry another network (not office/school Wi-Fi), turn off VPN/antivirus web shield, then run again.")
    if raw.lstrip().lower().startswith('<'):sys.exit("Sheet is private (got a login page). Share it as 'Anyone with the link can view'.")
    return list(csv.reader(io.StringIO(raw)))
import urllib.parse
def main():
    rows=fetch(*SOURCES[0])
    print('rows:',len(rows),'| header row sample:',rows[2][8:14] if len(rows)>2 else rows)
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
    if not __import__('os').environ.get('CI'):webbrowser.open((ROOT/'index.html').as_uri())
main()
