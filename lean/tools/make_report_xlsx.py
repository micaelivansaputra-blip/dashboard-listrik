import json,sys,datetime
from openpyxl import Workbook
from openpyxl.styles import Font,PatternFill,Alignment,Border,Side
from openpyxl.formatting.rule import CellIsRule,ColorScaleRule,FormulaRule
from openpyxl.utils import get_column_letter as L
d=json.load(open('rep.json'));out=sys.argv[1]
dt=datetime.date.fromisoformat(d['date']);MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];ds=f"{dt.day} {MN[dt.month-1]} {dt.year}"
NAVY=PatternFill('solid',fgColor='1F3864');HF=Font(bold=True,color='FFFFFF',name='Calibri',size=11);BF=Font(name='Calibri',size=11);B=Font(name='Calibri',size=11,bold=True)
thin=Side(style='thin',color='D9D9DE');BD=Border(left=thin,right=thin,top=thin,bottom=thin)
def hdr(ws,r,c0,vals,w=None):
    for i,v in enumerate(vals):
        c=ws.cell(r,c0+i,v);c.fill=NAVY;c.font=HF;c.alignment=Alignment(horizontal='center',vertical='center',wrap_text=True);c.border=BD
def box(ws,r1,r2,c1,c2):
    for r in range(r1,r2+1):
        for c in range(c1,c2+1):
            x=ws.cell(r,c);x.border=BD
            if x.font==Font():x.font=BF
S=sorted(d['sites'],key=lambda s:(s['r'],s['k']))
reg=lambda s:'REGION '+s['r'].replace('R','')
wb=Workbook()
# ---------- Detail Cinema
wd=wb.active;wd.title='Detail Cinema'
wd['A1']=f'Detail Cinema, Daily and MTD to {ds}';wd['A1'].font=Font(bold=True,size=14)
wd['A2']='Target = monthly budget spread by each cinema\'s weekly pattern (Sat-Sun, Thu-Fri, Mon-Wed). Gap, % and status are formulas.';wd['A2'].font=Font(italic=True,color='6E6E73')
H=['Region','Site','Cinema','ZOEC','Month budget (kWh)','Daily target','Daily actual','Daily gap kWh','Daily %','MTD target','MTD actual','MTD gap kWh','MTD %','Status MTD','Status daily','Main driver (MTD)','Days over (last 7)','Days with data (last 7)','Sat-Sun actual','Sat-Sun target','Sat-Sun gap','Thu-Fri actual','Thu-Fri target','Thu-Fri gap','Mon-Wed actual','Mon-Wed target','Mon-Wed gap','Share Sat-Sun','Share Thu-Fri','Share Mon-Wed','Notes']
hdr(wd,4,1,H);wd.row_dimensions[4].height=44
DN={'we':'Sat-Sun','th':'Thu-Fri','ot':'Mon-Wed'}
r0=5
for i,s in enumerate(S):
    r=r0+i;g=s['mtd']['g'];dd=s['daily']
    drv=None;bv=0
    for k in('we','th','ot'):
        x=g[k][0]-g[k][1]
        if x>bv:bv=x;drv=k
    notes=[]
    if s['bp']:notes.append('Oct budget used as proxy')
    if not s['ok']:notes.append('too little data, network pattern used')
    if dd['a'] is None:notes.append('no daily reading')
    if s['mtd']['n']==0:notes.append('no MTD data')
    row=[reg(s),s['k'],s['n'].upper(),'Y' if s['z'] else '',round(s['budget']),
      None if dd['a'] is None else round(dd['t'],1),dd['a'],
      f'=IF(G{r}="","",G{r}-F{r})',f'=IF(OR(G{r}="",F{r}=0),"",G{r}/F{r}-1)',
      round(s['mtd']['t'],1) if s['mtd']['n'] else None,round(s['mtd']['a'],1) if s['mtd']['n'] else None,
      f'=IF(K{r}="","",K{r}-J{r})',f'=IF(OR(K{r}="",J{r}=0),"",K{r}/J{r}-1)',
      f'=IF(M{r}="","n/a",IF(M{r}>Summary!$C$4,"ACTION",IF(M{r}>0,"Watch","On/under")))',
      f'=IF(I{r}="","n/a",IF(I{r}>Summary!$C$4,"ACTION",IF(I{r}>0,"Watch","On/under")))',
      DN.get(drv,'') if s['mtd']['n'] else '',s['n7'] if s['c7'] else None,s['c7'],
      round(g['we'][0],1),round(g['we'][1],1),f'=S{r}-T{r}',round(g['th'][0],1),round(g['th'][1],1),f'=V{r}-W{r}',round(g['ot'][0],1),round(g['ot'][1],1),f'=Y{r}-Z{r}',
      s['w'],s['t'],s['o'],'; '.join(notes)]
    for c,v in enumerate(row,1):wd.cell(r,c,v)
rl=r0+len(S)-1;box(wd,4,rl,1,len(H))
for r in range(r0,rl+1):
    for c in (5,6,7,8,10,11,12,19,20,21,22,23,24,25,26,27):wd.cell(r,c).number_format='#,##0;[Red]-#,##0'
    for c in (9,13):wd.cell(r,c).number_format='0%'
    for c in (28,29,30):wd.cell(r,c).number_format='0%'
for col in ('I','M'):
    wd.conditional_formatting.add(f'{col}{r0}:{col}{rl}',ColorScaleRule(start_type='num',start_value=-.3,start_color='63BE7B',mid_type='num',mid_value=0,mid_color='FFEB84',end_type='num',end_value=.3,end_color='E8643A'))
for col in ('N','O'):
    wd.conditional_formatting.add(f'{col}{r0}:{col}{rl}',CellIsRule(operator='equal',formula=['"ACTION"'],fill=PatternFill('solid',bgColor='F8CBAD',fgColor='F8CBAD'),font=Font(bold=True,color='9C0006')))
wd.freeze_panes='D5';wd.auto_filter.ref=f'A4:{L(len(H))}{rl}'
for c,w in zip(range(1,32),[10,6,34,6,12,10,10,10,9,11,11,11,9,11,11,13,9,9,10,10,10,10,10,10,10,10,10,9,9,9,40]):wd.column_dimensions[L(c)].width=w
# ---------- Summary
ws=wb.create_sheet('Summary',0)
ws['A1']='Daily Monitoring of Electricity';ws['A1'].font=Font(bold=True,size=16)
ws['A2']=f'Data to {ds}. Source: Google Sheet RAW SUMMARY, FY2026 kWh budget.';ws['A2'].font=Font(italic=True,color='6E6E73')
ws['B4']='Remind threshold (above target)';ws['B4'].font=B;ws['C4']=0.1;ws['C4'].number_format='0%';ws['C4'].fill=PatternFill('solid',fgColor='FFF2CC');ws['C4'].border=BD
ws['D4']='Change this cell to change ACTION status in the other sheets.';ws['D4'].font=Font(italic=True,color='6E6E73')
hdr(ws,6,2,['Region','Daily target','Daily actual','Daily %','MTD target','MTD actual','MTD %','Cinemas MTD over threshold','Cinemas daily over threshold'])
ws.row_dimensions[6].height=32
regs=sorted({reg(s) for s in S})
DR="'Detail Cinema'!"
for i,g in enumerate(regs):
    r=7+i;rg=f'{DR}$A$5:$A${rl}'
    ws.cell(r,2,g)
    ws.cell(r,3,f'=SUMIFS({DR}$F$5:$F${rl},{rg},B{r},{DR}$G$5:$G${rl},"<>")')
    ws.cell(r,4,f'=SUMIFS({DR}$G$5:$G${rl},{rg},B{r})')
    ws.cell(r,5,f'=IF(C{r}=0,"",D{r}/C{r}-1)')
    ws.cell(r,6,f'=SUMIFS({DR}$J$5:$J${rl},{rg},B{r})');ws.cell(r,7,f'=SUMIFS({DR}$K$5:$K${rl},{rg},B{r})');ws.cell(r,8,f'=IF(F{r}=0,"",G{r}/F{r}-1)')
    ws.cell(r,9,f'=COUNTIFS({rg},B{r},{DR}$M$5:$M${rl},">"&$C$4)');ws.cell(r,10,f'=COUNTIFS({rg},B{r},{DR}$I$5:$I${rl},">"&$C$4)')
t=7+len(regs)
ws.cell(t,2,'TOTAL')
for c in (3,4,6,7,9,10):ws.cell(t,c,f'=SUM({L(c)}7:{L(c)}{t-1})')
ws.cell(t,5,f'=IF(C{t}=0,"",D{t}/C{t}-1)');ws.cell(t,8,f'=IF(F{t}=0,"",G{t}/F{t}-1)')
box(ws,6,t,2,10)
for c in range(2,11):
    x=ws.cell(t,c);x.fill=NAVY;x.font=HF
for r in range(7,t+1):
    for c in (3,4,6,7):ws.cell(r,c).number_format='#,##0'
    for c in (5,8):ws.cell(r,c).number_format='0%'
for col in ('E','H'):
    ws.conditional_formatting.add(f'{col}7:{col}{t-1}',ColorScaleRule(start_type='num',start_value=-.3,start_color='63BE7B',mid_type='num',mid_value=0,mid_color='FFEB84',end_type='num',end_value=.3,end_color='E8643A'))
ws.cell(t+2,2,'Sheets').font=B
for i,(a,b) in enumerate([('Remind list','Cinemas above the threshold, MTD and daily (what the email shows).'),('Detail Cinema','All cinemas: target, actual, gap, status, day-type breakdown and weekly pattern.'),('Daily Actual / Daily Target','kWh per day for the month, same layout for easy comparison.'),('Shows vs kWh','Monthly kWh vs number of shows, kWh per show and the reading per cinema.'),('Method','How the 3-category target is calculated.')]):
    ws.cell(t+3+i,2,a).font=B;ws.cell(t+3+i,3,b)
ws.column_dimensions['A'].width=3;ws.column_dimensions['B'].width=34
for c in range(3,11):ws.column_dimensions[L(c)].width=15
# ---------- Remind list (static snapshot sorted)
wr=wb.create_sheet('Remind list',1)
wr['A1']=f'Cinemas to follow up, {ds} (above {10}% as of build; ACTION column in Detail Cinema follows the Summary threshold)';wr['A1'].font=Font(bold=True,size=13)
mo=sorted([s for s in S if s['mtd']['n'] and s['mtd']['t'] and s['mtd']['a']/s['mtd']['t']-1>.1],key=lambda s:-(s['mtd']['a']/s['mtd']['t']))
dv=sorted([s for s in S if s['daily']['a'] is not None and s['daily']['a']/s['daily']['t']-1>.1],key=lambda s:-(s['daily']['a']/s['daily']['t']))
wr['A3']=f'A. Over budget MTD ({len(mo)} cinemas)';wr['A3'].font=B
hdr(wr,4,1,['Region','Cinema','MTD target','MTD actual','Gap kWh','%','Main driver','Reason from CM','PIC / deadline'])
for i,s in enumerate(mo):
    r=5+i;g=s['mtd']['g'];drv=max(('we','th','ot'),key=lambda k:g[k][0]-g[k][1])
    for c,v in enumerate([reg(s),s['n'].upper(),round(s['mtd']['t'],1),round(s['mtd']['a'],1),f'=D{r}-C{r}',f'=D{r}/C{r}-1',DN[drv],'',''],1):wr.cell(r,c,v)
e=5+len(mo)-1;box(wr,4,e,1,9)
for r in range(5,e+1):
    for c in (3,4,5):wr.cell(r,c).number_format='#,##0'
    wr.cell(r,6).number_format='0%'
wr.conditional_formatting.add(f'F5:F{e}',ColorScaleRule(start_type='num',start_value=.1,start_color='F6C744',end_type='num',end_value=.5,end_color='E8643A'))
b0=e+3;wr.cell(b0,1,f'B. Over budget on daily usage, {ds} ({len(dv)} cinemas)').font=B
hdr(wr,b0+1,1,['Region','Cinema','Daily target','Daily actual','Gap kWh','%','Days over (last 7)','Reason from CM','PIC / deadline'])
for i,s in enumerate(dv):
    r=b0+2+i
    for c,v in enumerate([reg(s),s['n'].upper(),round(s['daily']['t'],1),s['daily']['a'],f'=D{r}-C{r}',f'=D{r}/C{r}-1',f"{s['n7']} / {s['c7']}",'',''],1):wr.cell(r,c,v)
e2=b0+2+len(dv)-1;box(wr,b0+1,e2,1,9)
for r in range(b0+2,e2+1):
    for c in (3,4,5):wr.cell(r,c).number_format='#,##0'
    wr.cell(r,6).number_format='0%'
wr.conditional_formatting.add(f'F{b0+2}:F{e2}',ColorScaleRule(start_type='num',start_value=.1,start_color='F6C744',end_type='num',end_value=.5,end_color='E8643A'))
miss=[s for s in S if s['daily']['a'] is None]
c0=e2+3;wr.cell(c0,1,f'C. Data not yet complete for {ds} ({len(miss)} cinemas)').font=B
for i,s in enumerate(miss):wr.cell(c0+1+i,1,reg(s));wr.cell(c0+1+i,2,s['n'].upper())
for c,w in zip('ABCDEFGHI',[10,34,11,11,11,8,16,34,18]):wr.column_dimensions[c].width=w
# ---------- Daily Actual / Target
for nm,key in (('Daily Actual','da'),('Daily Target','dt')):
    w=wb.create_sheet(nm);w['A1']=f'{nm} kWh, {MN[d["month"]]} 2026 (to {ds})';w['A1'].font=Font(bold=True,size=13)
    hdr(w,3,1,['Region','Site','Cinema']+[datetime.date.fromisoformat(x).day for x in d['days']]+['Total'])
    for i,s in enumerate(S):
        r=4+i;w.cell(r,1,reg(s));w.cell(r,2,s['k']);w.cell(r,3,s['n'].upper())
        for j,v in enumerate(s[key]):
            if v is not None:w.cell(r,4+j,round(v,1))
        w.cell(r,4+len(d['days']),f'=SUM(D{r}:{L(3+len(d["days"]))}{r})')
    box(w,3,3+len(S),1,4+len(d['days']))
    for r in range(4,4+len(S)):
        for c in range(4,5+len(d['days'])):w.cell(r,c).number_format='#,##0'
    w.freeze_panes='D4';w.column_dimensions['C'].width=34
    for c in range(4,5+len(d['days'])):w.column_dimensions[L(c)].width=8
    w.column_dimensions[L(4+len(d['days']))].width=11
# ---------- Shows vs kWh
wsw=wb.create_sheet('Shows vs kWh')
ms=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct']
wsw['A1']='kWh vs number of shows (monthly)';wsw['A1'].font=Font(bold=True,size=13)
wsw['A2']='kWh per month is estimated from days with a reading (average x days in month); blank when fewer than 15 days. Shows: Number_of_Show_Monthly_Per_Cinema.xlsx. Latest month with shows is compared with the month before.';wsw['A2'].font=Font(italic=True,color='6E6E73')
n=len(ms);ci=len(d['sites'][0]['shows']);
H2=['Region','Site','Cinema','kWh Sep','kWh Oct','Delta kWh %','Shows Sep','Shows Oct','Delta Shows %','kWh/show Sep','kWh/show Oct','kWh/show avg Jan-Aug','Reading']
hdr(wsw,4,1,H2);wsw.row_dimensions[4].height=32
for i,s in enumerate(S):
    r=5+i;k=s['kwh'];h=s['shows']
    g=lambda a,j:(a[j] if j<len(a) and a[j] else None)
    vals=[reg(s),s['k'],s['n'].upper(),g(k,8),g(k,9),f'=IF(OR(D{r}="",E{r}=""),"",E{r}/D{r}-1)',g(h,8),g(h,9),f'=IF(OR(G{r}="",H{r}=""),"",H{r}/G{r}-1)',
      f'=IF(OR(D{r}="",G{r}=""),"",D{r}/G{r})',f'=IF(OR(E{r}="",H{r}=""),"",E{r}/H{r})',None,
      f'=IF(OR(F{r}="",I{r}=""),"n/a",IF(F{r}>0.05,IF(AND(I{r}>0,I{r}>=F{r}/2),"Driven by shows","Not explained by shows"),IF(F{r}<-0.05,IF(I{r}<=F{r}/2,"Down with shows","Efficiency gain"),"Stable")))']
    rr=[(k[j]/h[j]) for j in range(8) if j<len(k) and j<len(h) and k[j] and h[j]]
    vals[11]=round(sum(rr)/len(rr),2) if rr else None
    for c,v in enumerate(vals,1):wsw.cell(r,c,v)
box(wsw,4,4+len(S),1,13)
for r in range(5,5+len(S)):
    for c in (4,5,7,8):wsw.cell(r,c).number_format='#,##0'
    for c in (6,9):wsw.cell(r,c).number_format='0.0%'
    for c in (10,11,12):wsw.cell(r,c).number_format='0.0'
wsw.conditional_formatting.add(f'M5:M{4+len(S)}',CellIsRule(operator='equal',formula=['"Not explained by shows"'],fill=PatternFill('solid',bgColor='F8CBAD',fgColor='F8CBAD'),font=Font(bold=True,color='9C0006')))
wsw.freeze_panes='D5';wsw.auto_filter.ref=f'A4:M{4+len(S)}'
for c,w in zip('ABCDEFGHIJKLM',[10,6,34,11,11,11,11,11,11,11,11,13,24]):wsw.column_dimensions[c].width=w
# monthly matrix kWh/show
m0=7+len(S);wsw.cell(m0,1,'kWh per show by month').font=B
hdr(wsw,m0+1,1,['Region','Site','Cinema']+ms)
for i,s in enumerate(S):
    r=m0+2+i;wsw.cell(r,1,reg(s));wsw.cell(r,2,s['k']);wsw.cell(r,3,s['n'].upper())
    for j in range(10):
        a=s['kwh'][j] if j<len(s['kwh']) else None;b=s['shows'][j] if j<len(s['shows']) else None
        if a and b:wsw.cell(r,4+j,round(a/b,2)).number_format='0.0'
box(wsw,m0+1,m0+1+len(S),1,13)
# ---------- Method
wm=wb.create_sheet('Method')
lines=['How the budget is divided (3 categories)','',
'1. Monthly budget: FY2026 kWh budget per cinema (example 500 kWh).',
'2. Average week = monthly budget / 4 weeks (500 / 4 = 125 kWh).',
"3. From actual usage of all months with data (each day divided by its own month average), work out the share of a normal week for each category: Sat-Sun, Thu-Fri (Thursday = new film premiere), Mon-Wed. A cinema own pattern is used only as far as it is consistent; otherwise the average pattern of all cinemas is used. Shares add up to 100%.",
'4. Daily target = category share / number of days in the category. The calendar of the month is then scaled so the full month equals the budget.',
'5. MTD target = sum of daily targets for the days that have data. Gap = actual - target; above 0 = over budget.','',
'Example (director): 125 kWh/week, Sat-Sun 45% = 56.3 kWh (28.1 per day), Thu-Fri 35% = 43.8 kWh (21.9 per day), Mon-Wed 20% = 25 kWh (8.3 per day). Dividing by 30 would give 16.7 kWh every day.','',
'Data notes','- A reading of 0 kWh is treated as not filled in. A daily value above 6x the cinema median is treated as a meter/typing error.',
'- Sites 70, 71, 72 use the October budget as a proxy. Cinemas with too little data per weekday use the network pattern.',
'- ACTION status follows the threshold in Summary!C4.']
for i,t in enumerate(lines,1):
    c=wm.cell(i,1,t);c.alignment=Alignment(wrap_text=True,vertical='top')
    if i in(1,12):c.font=Font(bold=True,size=13 if i==1 else 11)
wm.column_dimensions['A'].width=110
wb.save(out);print(out)
