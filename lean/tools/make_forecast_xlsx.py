import json,sys
from openpyxl import Workbook
from openpyxl.styles import Font,PatternFill,Alignment,Border,Side
from openpyxl.formatting.rule import ColorScaleRule,CellIsRule
from openpyxl.utils import get_column_letter as L
d=json.load(open('fc.json'));S=d['sites'];cnt=d['cnt']
NAVY=PatternFill('solid',fgColor='1F3864');HF=Font(bold=True,color='FFFFFF');thin=Side(style='thin',color='D9D9DE');BD=Border(left=thin,right=thin,top=thin,bottom=thin)
def hdr(ws,r,c0,v):
    for i,x in enumerate(v):
        c=ws.cell(r,c0+i,x);c.fill=NAVY;c.font=HF;c.alignment=Alignment(horizontal='center',vertical='center',wrap_text=True);c.border=BD
wb=Workbook();ws=wb.active;ws.title='Forecast per site'
ws['A1']='Forecast daily usage per site: Mon-Wed, Thu-Fri, Sat-Sun, and projected November total';ws['A1'].font=Font(bold=True,size=14)
ws['A2']=f'Level = average kWh/day of the last 28 days to {d["last"]} (days with a reading). Forecast = level x category index. Projected Nov = actual days + forecast for the other days. Blue cells are inputs; the rest are formulas.';ws['A2'].font=Font(italic=True,color='6E6E73')
ws['A3']='Days in November';ws['A3'].font=Font(bold=True)
ws['C3']='Mon-Wed';ws['D3']=cnt['ot'];ws['E3']='Thu-Fri';ws['F3']=cnt['th'];ws['G3']='Sat-Sun';ws['H3']=cnt['we']
H=['Region','Site','Cinema','Level kWh/day (last 28d)','Index Mon-Wed','Index Thu-Fri','Index Sat-Sun',
 'Forecast Mon-Wed','Forecast Thu-Fri','Forecast Sat-Sun','Target/day Mon-Wed','Target/day Thu-Fri','Target/day Sat-Sun',
 'Gap/day Mon-Wed %','Gap/day Thu-Fri %','Gap/day Sat-Sun %','Nov budget','Actual to date','Days forecast: Mon-Wed','Days forecast: Thu-Fri','Days forecast: Sat-Sun','Projected Nov total','Projected gap kWh','Projected gap %','Status','Notes']
hdr(ws,5,1,H);ws.row_dimensions[5].height=48
blue=Font(color='0000FF')
for i,s in enumerate(S):
    r=6+i;lv=s['level']
    notes=[]
    if lv is None:notes.append('no reading in the last 28 days, no forecast')
    if s['bp']:notes.append('Oct budget used as proxy')
    if not s['ok']:notes.append('too little data, network pattern used')
    row=[s['r'].replace('R','REGION '),s['k'],s['n'].upper(),None if lv is None else round(lv,1),round(s['idx']['ot'],4),round(s['idx']['th'],4),round(s['idx']['we'],4),
     f'=IF(D{r}="","",D{r}*E{r})',f'=IF(D{r}="","",D{r}*F{r})',f'=IF(D{r}="","",D{r}*G{r})',
     round(s['tg']['ot'],1),round(s['tg']['th'],1),round(s['tg']['we'],1),
     f'=IF(H{r}="","",H{r}/K{r}-1)',f'=IF(I{r}="","",I{r}/L{r}-1)',f'=IF(J{r}="","",J{r}/M{r}-1)',
     round(s['budget']),round(s['act'],1),s['c']['ot'],s['c']['th'],s['c']['we'],
     f'=IF(D{r}="","",R{r}+H{r}*S{r}+I{r}*T{r}+J{r}*U{r})',f'=IF(V{r}="","",V{r}-Q{r})',f'=IF(V{r}="","",V{r}/Q{r}-1)',
     f'=IF(X{r}="","n/a",IF(X{r}>Summary!$C$3,"OVER",IF(X{r}>0,"Slightly over","Within budget")))','; '.join(notes)]
    for c,v in enumerate(row,1):ws.cell(r,c,v)
    for c in (4,5,6,7,11,12,13,17,18,19,20,21):ws.cell(r,c).font=blue
e=5+len(S)
for r in range(5,e+1):
    for c in range(1,27):ws.cell(r,c).border=BD
    for c in (4,8,9,10,11,12,13,17,18,22,23):ws.cell(r,c).number_format='#,##0'
    for c in (14,15,16,24):ws.cell(r,c).number_format='0%'
    for c in (5,6,7):ws.cell(r,c).number_format='0.000'
for col in 'NOPX':
    ws.conditional_formatting.add(f'{col}6:{col}{e}',ColorScaleRule(start_type='num',start_value=-.3,start_color='63BE7B',mid_type='num',mid_value=0,mid_color='FFEB84',end_type='num',end_value=.3,end_color='E8643A'))
ws.conditional_formatting.add(f'Y6:Y{e}',CellIsRule(operator='equal',formula=['"OVER"'],fill=PatternFill('solid',bgColor='F8CBAD',fgColor='F8CBAD'),font=Font(bold=True,color='9C0006')))
ws.freeze_panes='D6';ws.auto_filter.ref=f'A5:Z{e}'
for c,w in zip(range(1,27),[10,6,34,12,9,9,9,11,11,11,11,11,11,10,10,10,11,11,10,10,10,12,11,10,14,40]):ws.column_dimensions[L(c)].width=w
# Summary
sm=wb.create_sheet('Summary',0)
sm['A1']='Forecast summary, November 2026';sm['A1'].font=Font(bold=True,size=16)
sm['A2']=f'Data to {d["last"]}. Forecast = recent level x weekly category pattern; target = budget spread by the same pattern (Sat-Sun >= Thu-Fri >= Mon-Wed).';sm['A2'].font=Font(italic=True,color='6E6E73')
sm['B3']='OVER threshold (projected, above budget)';sm['B3'].font=Font(bold=True);sm['C3']=0.1;sm['C3'].number_format='0%';sm['C3'].fill=PatternFill('solid',fgColor='FFF2CC');sm['C3'].border=BD
hdr(sm,5,2,['Region','Cinemas with forecast','Forecast/day Mon-Wed','Forecast/day Thu-Fri','Forecast/day Sat-Sun','Target/day Mon-Wed','Target/day Thu-Fri','Target/day Sat-Sun','Nov budget','Projected Nov total','Projected gap kWh','Projected gap %','Cinemas OVER'])
sm.row_dimensions[5].height=44
F="'Forecast per site'!"
rg=sorted({'REGION '+s['r'].replace('R','') for s in S})
for i,g in enumerate(rg):
    r=6+i;A=f'{F}$A$6:$A${e}'
    sm.cell(r,2,g)
    sm.cell(r,3,f'=COUNTIFS({A},B{r},{F}$D$6:$D${e},">0")')
    for c,col in zip((4,5,6),'HIJ'):sm.cell(r,c,f'=SUMIFS({F}${col}$6:${col}${e},{A},B{r})')
    for c,col,fc in zip((7,8,9),'KLM','HIJ'):sm.cell(r,c,f'=SUMIFS({F}${col}$6:${col}${e},{A},B{r},{F}${fc}$6:${fc}${e},"<>")')
    sm.cell(r,10,f'=SUMIFS({F}$Q$6:$Q${e},{A},B{r},{F}$V$6:$V${e},"<>")');sm.cell(r,11,f'=SUMIFS({F}$V$6:$V${e},{A},B{r})')
    sm.cell(r,12,f'=K{r}-J{r}');sm.cell(r,13,f'=IF(J{r}=0,"",K{r}/J{r}-1)');sm.cell(r,14,f'=COUNTIFS({A},B{r},{F}$X$6:$X${e},">"&$C$3)')
t=6+len(rg);sm.cell(t,2,'TOTAL')
for c in (3,4,5,6,7,8,9,10,11,12,14):sm.cell(t,c,f'=SUM({L(c)}6:{L(c)}{t-1})')
sm.cell(t,13,f'=IF(J{t}=0,"",K{t}/J{t}-1)')
for r in range(5,t+1):
    for c in range(2,15):sm.cell(r,c).border=BD
    for c in (4,5,6,7,8,9,10,11,12):sm.cell(r,c).number_format='#,##0'
    sm.cell(r,13).number_format='0%'
for c in range(2,15):
    x=sm.cell(t,c);x.fill=NAVY;x.font=HF
sm.conditional_formatting.add(f'M6:M{t-1}',ColorScaleRule(start_type='num',start_value=-.3,start_color='63BE7B',mid_type='num',mid_value=0,mid_color='FFEB84',end_type='num',end_value=.3,end_color='E8643A'))
sm.column_dimensions['A'].width=3;sm.column_dimensions['B'].width=38
for c in range(3,15):sm.column_dimensions[L(c)].width=14
# Method
mt=wb.create_sheet('Method')
lines=['How the forecast is calculated','',
'1. Level: average kWh per day of the last 28 days that have a reading (a cinema needs at least 14 readings).',
'2. Category index: how a Mon-Wed, Thu-Fri or Sat-Sun day compares with an average day, from the weekly pattern of the cinema (blended with the network pattern by consistency) and the order rule Sat-Sun >= Thu-Fri >= Mon-Wed (each step at least 2%).',
'3. Forecast per day = level x category index.',
'4. Target per day = November budget spread by the same pattern (the 30 days add up to the budget).',
'5. Projected November total = actual kWh of the days with a reading + forecast per day x number of remaining days in each category.',
'6. Gap = projected total - budget. OVER means above the threshold in Summary!C3.','',
'Limits','- This is a projection from recent behaviour, not a promise. It assumes no change in operations (event, equipment, savings program) for the rest of the month.',
'- Days not yet reported (data lags a few days) are forecast like the remaining days.',
'- Cinemas with no reading in the last 28 days have no forecast.']
for i,t_ in enumerate(lines,1):
    c=mt.cell(i,1,t_);c.alignment=Alignment(wrap_text=True,vertical='top')
    if i in(1,10):c.font=Font(bold=True,size=13 if i==1 else 11)
mt.column_dimensions['A'].width=110
wb.save('out/Forecast_Daily_per_Category_Nov2026.xlsx')
