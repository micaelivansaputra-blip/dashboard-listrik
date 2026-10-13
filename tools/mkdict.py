import pathlib
HERE=pathlib.Path(__file__).resolve().parent.parent
import json,glob,re
TOKD=re.compile(r'\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|[+−]?\d(?:[\d,]*\d)?(?:\.\d+)?%?')
TOK=re.compile(TOKD.pattern.replace('(Mon|Tue|Wed|Thu|Fri|Sat|Sun|January','(January'))
def conv(raw,tr):
    rx=TOKD if re.search(r'\d',raw) else TOK
    toks=[m.group(0) for m in rx.finditer(raw)]
    key=rx.sub('§',raw)
    used=set(); 
    def rep(m):
        t=m.group(0)
        for i,x in enumerate(toks):
            if x==t and i not in used: used.add(i); return '§%d'%(i+1)
        for i,x in enumerate(toks):
            if x==t: return '§%d'%(i+1)
        return t
    out=rx.sub(rep,tr)
    return key,out

D={'id':{},'es':{}}
for f in sorted(glob.glob(str(HERE/'src/i18n/dict_*.txt'))):
    for ln,l in enumerate(open(f,encoding='utf8')):
        l=l.rstrip('\n')
        if not l.strip() or l.startswith('#'): continue
        p=[x.strip() for x in l.split(' || ')]
        if len(p)!=3: print('BAD',f,ln+1,l[:80]); continue
        k,i,e=p
        if '§' not in k and TOKD.search(k):
            k2,i=conv(k,i); _,e=conv(k,e); k=k2
        if k.count('§')!=i.count('§') or k.count('§')!=e.count('§'):
            if '§1' not in i+e: print('§ MISMATCH',f,ln+1,k[:70])
        D['id'][k]=i; D['es'][k]=e
json.dump(D,open(HERE/'src/i18n/dict.json','w'),ensure_ascii=False)
print(len(D['id']),'entries')
