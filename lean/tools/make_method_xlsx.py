import json
from openpyxl import Workbook
from openpyxl.styles import Font,PatternFill,Alignment,Border,Side
from openpyxl.utils import get_column_letter as L
d=json.load(open('mt.json'));S=d['sites'];NET=d['net']
NAVY=PatternFill('solid',fgColor='1F3864');HF=Font(bold=True,color='FFFFFF');thin=Side(style='thin',color='D9D9DE');BD=Border(left=thin,right=thin,top=thin,bottom=thin)
BLUE=Font(color='0000FF');wb=Workbook()
# ---------- Per site
ws=wb.active;ws.title='Per site'
ws['A1']='Daily target per site: pattern, confidence, category order and target per day (November 2026)';ws['A1'].font=Font(bold=True,size=14)
ws['A2']='Blue = input from the data. Everything else is a formula, so each step can be traced. Read the Method sheet first.';ws['A2'].font=Font(italic=True,color='6E6E73')
ws['B3']='Min step between categories';ws['C3']=d['step'];ws['C3'].number_format='0%';ws['C3'].font=BLUE
ws['E3']='Days Mon-Wed';ws['F3']=13;ws['G3']='Thu-Fri';ws['H3']=8;ws['I3']='Sat-Sun';ws['J3']=9
for c in ('F3','H3','J3'):ws[c].font=BLUE
ws['L3']='Days in month';ws['M3']='=F3+H3+J3'
H=['Region','Site','Cinema','Min readings per weekday','Own Mon','Own Tue','Own Wed','Own Thu','Own Fri','Own Sat','Own Sun','Noise (variance of the mean)','Variance of weekday means','Pattern strength (signal)','Confidence in own pattern',
 'Used Mon','Used Tue','Used Wed','Used Thu','Used Fri','Used Sat','Used Sun','Index Mon-Wed','Index Thu-Fri','Index Sat-Sun',
 'a: Mon-Wed','b: Thu-Fri / (1+step)','c: Sat-Sun / (1+step)^2','Ordered a','Ordered b','Ordered c','Final index Mon-Wed','Final index Thu-Fri','Final index Sat-Sun',
 'Weekly share Mon-Wed','Weekly share Thu-Fri','Weekly share Sat-Sun','Nov budget (kWh)','Target/day Mon-Wed','Target/day Thu-Fri','Target/day Sat-Sun','Check: month sum - budget','Flat budget/30','Notes']
ws['A5']='NETWORK PATTERN (median of all cinemas, each normalised to its month average)';ws['A5'].font=Font(bold=True)
for j,v in enumerate(NET):c=ws.cell(5,5+j,round(v,4));c.font=BLUE;c.number_format='0.000'
for i,x in enumerate(H):
    c=ws.cell(7,1+i,x);c.fill=NAVY;c.font=HF;c.alignment=Alignment(horizontal='center',vertical='center',wrap_text=True);c.border=BD
ws.row_dimensions[7].height=62
for i,s in enumerate(S):
    r=8+i;notes=[]
    if s['own'] is None:notes.append('too little data, network pattern used')
    if s['bp']:notes.append('Oct budget used as proxy')
    ws.cell(r,1,s['r'].replace('R','REGION '));ws.cell(r,2,s['k']);ws.cell(r,3,s['n'].upper())
    if s['own']:
        ws.cell(r,4,s['nmin'])
        for j,v in enumerate(s['own']):ws.cell(r,5+j,round(v,4))
        ws.cell(r,12,round(s['noise'],6))
    for c in range(4,13):ws.cell(r,c).font=BLUE
    ws.cell(r,13,f'=IF(E{r}="","",VARP(E{r}:K{r}))');ws.cell(r,14,f'=IF(E{r}="","",MAX(M{r}-L{r},0))')
    ws.cell(r,15,f'=IF(E{r}="",0,IF(N{r}+L{r}=0,0,N{r}/(N{r}+L{r})))')
    for j in range(7):
        ownc=L(5+j);ws.cell(r,16+j,f'=IF($E{r}="",{ownc}$5,$O{r}*{ownc}{r}+(1-$O{r})*{ownc}$5)')
    ws.cell(r,23,f'=AVERAGE(P{r}:R{r})');ws.cell(r,24,f'=AVERAGE(S{r}:T{r})');ws.cell(r,25,f'=AVERAGE(U{r}:V{r})')
    ws.cell(r,26,f'=W{r}');ws.cell(r,27,f'=X{r}/(1+$C$3)');ws.cell(r,28,f'=Y{r}/(1+$C$3)^2')
    Z,AA,AB=f'Z{r}',f'AA{r}',f'AB{r}'
    cond1=f'AND({Z}<={AA},{AA}<={AB})';cond2=f'AND({Z}>{AA},(3*{Z}+2*{AA})/5<={AB})';cond3=f'AND({AA}>{AB},{Z}<=({AA}+{AB})/2)'
    allp=f'(3*{Z}+2*{AA}+2*{AB})/7'
    ws.cell(r,29,f'=IF({cond1},{Z},IF({cond2},(3*{Z}+2*{AA})/5,IF({cond3},{Z},{allp})))')
    ws.cell(r,30,f'=IF({cond1},{AA},IF({cond2},(3*{Z}+2*{AA})/5,IF({cond3},({AA}+{AB})/2,{allp})))')
    ws.cell(r,31,f'=IF({cond1},{AB},IF({cond2},{AB},IF({cond3},({AA}+{AB})/2,{allp})))')
    ws.cell(r,32,f'=AC{r}');ws.cell(r,33,f'=AD{r}*(1+$C$3)');ws.cell(r,34,f'=AE{r}*(1+$C$3)^2')
    ws.cell(r,35,f'=3*AF{r}/(3*AF{r}+2*AG{r}+2*AH{r})');ws.cell(r,36,f'=2*AG{r}/(3*AF{r}+2*AG{r}+2*AH{r})');ws.cell(r,37,f'=2*AH{r}/(3*AF{r}+2*AG{r}+2*AH{r})')
    ws.cell(r,38,round(s['budget'])).font=BLUE
    den=f'($F$3*AF{r}+$H$3*AG{r}+$J$3*AH{r})'
    ws.cell(r,39,f'=AL{r}*AF{r}/{den}');ws.cell(r,40,f'=AL{r}*AG{r}/{den}');ws.cell(r,41,f'=AL{r}*AH{r}/{den}')
    ws.cell(r,42,f'=$F$3*AM{r}+$H$3*AN{r}+$J$3*AO{r}-AL{r}');ws.cell(r,43,f'=AL{r}/$M$3');ws.cell(r,44,'; '.join(notes))
e=7+len(S)
for r in range(7,e+1):
    for c in range(1,45):ws.cell(r,c).border=BD
    for c in range(5,12):ws.cell(r,c).number_format='0.000'
    ws.cell(r,12).number_format='0.00000';ws.cell(r,13).number_format='0.00000';ws.cell(r,14).number_format='0.00000';ws.cell(r,15).number_format='0%'
    for c in range(16,23):ws.cell(r,c).number_format='0.000'
    for c in range(23,35):ws.cell(r,c).number_format='0.000'
    for c in (35,36,37):ws.cell(r,c).number_format='0.0%'
    for c in (38,39,40,41,43):ws.cell(r,c).number_format='#,##0'
    ws.cell(r,42).number_format='0.00'
ws.freeze_panes='D8';ws.auto_filter.ref=f'A7:AR{e}'
for c in range(1,45):ws.column_dimensions[L(c)].width=11
ws.column_dimensions['C'].width=34;ws.column_dimensions['AR'].width=36
# ---------- Method
mt=wb.create_sheet('Method',0)
lines=[('Method: how the 3 day categories and the daily target are calculated',1),'',
('Short answer to "do we use the average of previous months?"',2),
'Yes. The weekly pattern of each cinema comes from the actual usage of all previous months with data (January up to the latest reporting day), not from the monthly budget. The budget only decides the total; the pattern decides how that total is spread over the days.','',
('Step by step',2),
'1. Monthly budget per cinema from the FY2026 kWh budget file (example: 48,889 kWh for November).',
'2. Month-normalised daily usage: every day with a reading is divided by the average daily usage of its own month (months with at least 15 readings). 1.00 means "same as an average day of that month". This keeps level changes, such as the savings program, from bending the weekday pattern.',
'3. Own pattern: average the normalised values per weekday over all months (Mon, Tue, ... Sun). Needs at least 6 readings per weekday.',
'4. Network pattern: median of all cinemas for each weekday (row 5 of the Per site sheet).',
'5. Confidence in the own pattern (0 to 1): compare how different the weekdays are (variance of the 7 weekday averages) with how much one weekday varies from week to week (noise). Signal = max(variance - noise, 0); confidence = signal / (signal + noise).',
'6. Used pattern = confidence x own + (1 - confidence) x network. A cinema with a clear pattern keeps it; a noisy one falls back to the network pattern.',
'7. Three categories: Mon-Wed (average of Mon, Tue, Wed), Thu-Fri (Thursday is the new film premiere) and Sat-Sun (weekend).',
'8. Order rule from the director: Sat-Sun >= Thu-Fri >= Mon-Wed, each step at least the step in cell C3 (2%). Where the data already respects it nothing changes; where it does not, the categories are pooled by their number of days and separated again by the step.',
'9. Weekly share of each category = days x index / sum. The three shares add up to 100%. (Mon-Wed has 3 days, Thu-Fri 2, Sat-Sun 2.)',
'10. Daily target = budget x index of the day / sum over the month of (number of days in category x index). Therefore the target of all days of the month adds up exactly to the budget (column AP = 0).',
'11. MTD target does not use categories: budget / days in the month x days with a reading.','',
('Example: The Park Pejaten, November 2026',2),
'Budget 48,889 kWh. Flat budget per day (48,889 / 30) = 1,630. With the categories: Mon-Wed 1,601, Thu-Fri 1,634, Sat-Sun 1,667. Check: 13 x 1,601 + 8 x 1,634 + 9 x 1,667 = 48,889. See the row of this cinema in the Per site sheet.','',
('Director example (500 kWh) for comparison',2),
'500 / 4 weeks = 125 kWh per week. With Sat-Sun 45%, Thu-Fri 35%, Mon-Wed 20%: 28.1 / 21.9 / 8.3 kWh per day. In the real data the weekday differences are much smaller (a few percent), which is why the daily targets stay close to budget / 30.','',
('What the data shows',2),
'- Sunday is the highest day (about +4% above an average day). Thu-Fri is NOT higher than Mon-Wed in the electricity data, so the order rule is applied as a business rule, not as something the data proves.',
'- For most cinemas the own weekday pattern is not stronger than normal week-to-week noise, so they mostly use the network pattern.',
'- A reading of 0 kWh is treated as not filled in; a daily value above 6x the cinema median is treated as a data error.']
for i,t in enumerate(lines,1):
    txt=t[0] if isinstance(t,tuple) else t
    c=mt.cell(i,1,txt);c.alignment=Alignment(wrap_text=True,vertical='top')
    if isinstance(t,tuple):c.font=Font(bold=True,size=14 if t[1]==1 else 12)
mt.column_dimensions['A'].width=125
wb.save('out/Metode_3_Kategori_per_Site.xlsx')
