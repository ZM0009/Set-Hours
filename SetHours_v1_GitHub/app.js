const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const STORE='sethours_v1';
const defaultData={
  settings:{hourlyRate:70,overtimeMultiplier:1.5,weeklyThreshold:40,currency:'AUD',defaultRole:'Challenge Producer'},
  current:{production:'',role:'',location:'',notes:''},
  activeShift:null,
  shifts:[],
  productions:[{id:crypto.randomUUID(),name:'Extracted S3',role:'Challenge Producer',location:'',rate:70}]
};
let data=loadData(), selectedMonday=getMonday(new Date()), timerId=null;

function loadData(){try{return {...structuredClone(defaultData),...JSON.parse(localStorage.getItem(STORE)||'{}')}}catch{return structuredClone(defaultData)}}
function saveData(){localStorage.setItem(STORE,JSON.stringify(data));}
function getMonday(d){d=new Date(d);d.setHours(0,0,0,0);const day=d.getDay();d.setDate(d.getDate()+(day===0?-6:1-day));return d}
function isoLocal(d){const x=new Date(d);x.setMinutes(x.getMinutes()-x.getTimezoneOffset());return x.toISOString().slice(0,10)}
function fmtTime(v){if(!v)return'—';return new Date(v).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
function money(v){return new Intl.NumberFormat(undefined,{style:'currency',currency:data.settings.currency||'AUD'}).format(v||0)}
function hoursBetween(a,b){return Math.max(0,(new Date(b)-new Date(a))/36e5)}
function shiftHours(s){
  let gross=hoursBetween(s.start,s.end||Date.now());
  let breaks=(s.breaks||[]).reduce((n,b)=>n+hoursBetween(b.start,b.end||Date.now()),0);
  return Math.max(0,gross-breaks)+(Number(s.travel)||0)
}
function weekShifts(monday=selectedMonday){
  const end=new Date(monday);end.setDate(end.getDate()+7);
  return data.shifts.filter(s=>new Date(s.start)>=monday&&new Date(s.start)<end)
}
function calcWeek(monday=selectedMonday){
  const shifts=weekShifts(monday);const total=shifts.reduce((n,s)=>n+shiftHours(s),0);
  const travel=shifts.reduce((n,s)=>n+(Number(s.travel)||0),0);
  const regular=Math.min(total,data.settings.weeklyThreshold), overtime=Math.max(0,total-data.settings.weeklyThreshold);
  const pay=regular*data.settings.hourlyRate+overtime*data.settings.hourlyRate*data.settings.overtimeMultiplier;
  return{shifts,total,travel,regular,overtime,pay}
}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}
function showView(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===id));$$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));render()}
function render(){
  $('#todayLabel').textContent='TODAY • '+new Date().toLocaleDateString([],{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  $('#currentProduction').textContent=data.current.production||'Not selected';
  $('#currentRole').textContent=data.current.role||data.settings.defaultRole||'Not selected';
  $('#currentLocation').textContent=data.current.location||'Not selected';
  $('#currentNotes').textContent=data.current.notes||'None';
  $('#weeklyThresholdLabel').textContent=data.settings.weeklyThreshold;
  $('#idleState').classList.toggle('hidden',!!data.activeShift);
  $('#activeState').classList.toggle('hidden',!data.activeShift);
  if(data.activeShift){
    $('#startedAt').textContent='Started '+fmtTime(data.activeShift.start)+' • '+new Date(data.activeShift.start).toLocaleDateString();
    const activeBreak=(data.activeShift.breaks||[]).find(b=>!b.end);
    $('#breakBtn').textContent=activeBreak?'☕ END BREAK':'☕ START BREAK';
  }
  renderWeek();
  renderProductions();
  renderPay();
}
function renderWeek(){
  const c=calcWeek(selectedMonday), cur=calcWeek(getMonday(new Date()));
  $('#weekTotal').textContent=cur.total.toFixed(2);$('#weekRegular').textContent=cur.regular.toFixed(2);$('#weekOvertime').textContent=cur.overtime.toFixed(2);$('#weekPay').textContent=money(cur.pay);$('#weekTravel').textContent=cur.travel.toFixed(2);
  $('#tsTotal').textContent=c.total.toFixed(2);$('#tsRegular').textContent=c.regular.toFixed(2);$('#tsOvertime').textContent=c.overtime.toFixed(2);$('#tsPay').textContent=money(c.pay);$('#tsTravel').textContent=c.travel.toFixed(2);
  const end=new Date(selectedMonday);end.setDate(end.getDate()+6);
  $('#weekRange').textContent=selectedMonday.toLocaleDateString([],{day:'numeric',month:'short'})+' – '+end.toLocaleDateString([],{day:'numeric',month:'short',year:'numeric'});
  const rows=[];
  for(let i=0;i<7;i++){
    const d=new Date(selectedMonday);d.setDate(d.getDate()+i);
    const ss=c.shifts.filter(s=>isoLocal(s.start)===isoLocal(d));
    const h=ss.reduce((n,s)=>n+shiftHours(s),0);
    const start=ss[0]?.start,endv=ss.at(-1)?.end;
    const breakH=ss.reduce((n,s)=>n+(s.breaks||[]).reduce((m,b)=>m+hoursBetween(b.start,b.end||Date.now()),0),0);
    rows.push(`<button class="week-row" data-date="${isoLocal(d)}"><span>${d.toLocaleDateString([],{weekday:'short',day:'numeric',month:'short'})}</span><span class="hours">${h?h.toFixed(2):'—'}</span><small>${start?fmtTime(start)+' – '+fmtTime(endv):'—'}</small><small>${breakH?breakH.toFixed(2)+'h break':''}</small></button>`)
  }
  $('#weekRows').innerHTML=rows.join('');
  $$('#weekRows .week-row').forEach(b=>b.onclick=()=>openDay(b.dataset.date));
  const by={};cur.shifts.forEach(s=>{const k=s.production||'Unassigned';by[k]=(by[k]||0)+shiftHours(s)});
  $('#productionSummary').innerHTML=Object.entries(by).length?Object.entries(by).map(([k,h])=>`<div class="production-item"><span>${k}</span><span>${h.toFixed(2)}h</span><span class="money">${money(h*data.settings.hourlyRate)}</span></div>`).join(''):'<div style="padding:15px;color:var(--muted)">No shifts this week.</div>';
}
function renderProductions(){
  $('#productionsList').innerHTML=data.productions.map(p=>`<div class="production-card"><h3>${p.name}</h3><p>${p.role||'No role saved'}</p><p>${p.location||'No location saved'}</p><button data-use="${p.id}">Use for current shift</button></div>`).join('');
  $$('[data-use]').forEach(b=>b.onclick=()=>{const p=data.productions.find(x=>x.id===b.dataset.use);data.current={...data.current,production:p.name,role:p.role||'',location:p.location||''};saveData();showView('todayView');toast('Production selected')})
}
function renderPay(){
  const c=calcWeek(getMonday(new Date()));$('#payEstimate').textContent=money(c.pay);
  $('#payBreakdown').innerHTML=[
    ['Regular hours',`${c.regular.toFixed(2)} × ${money(data.settings.hourlyRate)}`],
    ['Overtime hours',`${c.overtime.toFixed(2)} × ${data.settings.overtimeMultiplier}`],
    ['Travel included',`${c.travel.toFixed(2)} hours`],
    ['Estimated gross',money(c.pay)]
  ].map(x=>`<div class="breakdown-row"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')
}
function tick(){
  if(!data.activeShift)return;
  const secs=Math.floor((Date.now()-new Date(data.activeShift.start))/1000);
  const h=String(Math.floor(secs/3600)).padStart(2,'0'),m=String(Math.floor(secs%3600/60)).padStart(2,'0'),s=String(secs%60).padStart(2,'0');
  $('#liveTimer').textContent=`${h}:${m}:${s}`
}
function clockIn(){
  data.activeShift={id:crypto.randomUUID(),start:new Date().toISOString(),end:null,breaks:[],travel:0,...data.current,role:data.current.role||data.settings.defaultRole};
  saveData();render();tick();toast('Shift started')
}
function clockOut(){
  if(!data.activeShift)return;
  const open=(data.activeShift.breaks||[]).find(b=>!b.end);if(open)open.end=new Date().toISOString();
  data.activeShift.end=new Date().toISOString();data.shifts.push(data.activeShift);data.activeShift=null;saveData();render();toast('Shift complete')
}
function toggleBreak(){
  const open=(data.activeShift.breaks||[]).find(b=>!b.end);
  if(open)open.end=new Date().toISOString();else data.activeShift.breaks.push({start:new Date().toISOString(),end:null});
  saveData();render()
}
function field(label,name,value='',type='text'){return `<div class="field"><label>${label}</label><input type="${type}" name="${name}" value="${String(value??'').replaceAll('"','&quot;')}"></div>`}
function area(label,name,value=''){return `<div class="field"><label>${label}</label><textarea name="${name}">${value??''}</textarea></div>`}
function modal(title,html,onSave){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;$('#modal').showModal();$('#modalForm').onsubmit=e=>{e.preventDefault();const fd=Object.fromEntries(new FormData(e.target));onSave(fd);$('#modal').close()}}
function editCurrent(key){
  const labels={production:'Production',role:'Role',location:'Location',notes:'Episode / Notes'};
  modal('Edit '+labels[key],key==='notes'?area(labels[key],key,data.current[key]):field(labels[key],key,data.current[key]),fd=>{data.current[key]=fd[key];saveData();render()})
}
function addTravel(){modal('Add Travel',field('Paid travel hours','travel','0','number'),fd=>{data.activeShift.travel=(Number(data.activeShift.travel)||0)+(Number(fd.travel)||0);saveData();render();toast('Travel added')})}
function addManual(){
  const now=new Date(), date=isoLocal(now);
  modal('Add Manual Shift',field('Date','date',date,'date')+field('Start','start','08:00','time')+field('Finish','finish','18:00','time')+field('Break minutes','breakMins','60','number')+field('Travel hours','travel','0','number')+field('Production','production',data.current.production)+field('Role','role',data.current.role||data.settings.defaultRole)+area('Notes','notes',''),fd=>{
    const start=new Date(fd.date+'T'+fd.start),end=new Date(fd.date+'T'+fd.finish);if(end<=start)end.setDate(end.getDate()+1);
    const breaks=Number(fd.breakMins)?[{start:new Date(start.getTime()+4*36e5).toISOString(),end:new Date(start.getTime()+4*36e5+Number(fd.breakMins)*60000).toISOString()}]:[];
    data.shifts.push({id:crypto.randomUUID(),start:start.toISOString(),end:end.toISOString(),breaks,travel:Number(fd.travel)||0,production:fd.production,role:fd.role,notes:fd.notes,location:''});saveData();render();toast('Shift added')
  })
}
function openDay(date){const ss=data.shifts.filter(s=>isoLocal(s.start)===date);if(!ss.length){addManual();return}const s=ss[0];modal('Edit Shift',field('Start','start',new Date(s.start).toTimeString().slice(0,5),'time')+field('Finish','finish',new Date(s.end).toTimeString().slice(0,5),'time')+field('Travel hours','travel',s.travel,'number')+field('Production','production',s.production)+area('Notes','notes',s.notes),fd=>{const st=new Date(s.start),en=new Date(s.end);const [sh,sm]=fd.start.split(':');const [eh,em]=fd.finish.split(':');st.setHours(sh,sm,0,0);en.setHours(eh,em,0,0);if(en<=st)en.setDate(en.getDate()+1);Object.assign(s,{start:st.toISOString(),end:en.toISOString(),travel:Number(fd.travel)||0,production:fd.production,notes:fd.notes});saveData();render()})}
function settings(){modal('Settings',field('Hourly rate','hourlyRate',data.settings.hourlyRate,'number')+field('Weekly overtime threshold','weeklyThreshold',data.settings.weeklyThreshold,'number')+field('Overtime multiplier','overtimeMultiplier',data.settings.overtimeMultiplier,'number')+field('Currency code','currency',data.settings.currency)+field('Default role','defaultRole',data.settings.defaultRole),fd=>{Object.assign(data.settings,{hourlyRate:Number(fd.hourlyRate),weeklyThreshold:Number(fd.weeklyThreshold),overtimeMultiplier:Number(fd.overtimeMultiplier),currency:fd.currency.toUpperCase(),defaultRole:fd.defaultRole});saveData();render()})}
function addProduction(){modal('Add Production',field('Production name','name')+field('Default role','role',data.settings.defaultRole)+field('Location','location')+field('Hourly rate','rate',data.settings.hourlyRate,'number'),fd=>{data.productions.push({id:crypto.randomUUID(),...fd,rate:Number(fd.rate)});saveData();render()})}
function exportCsv(){
  const rows=[['Date','Production','Role','Location','Start','Finish','Break Hours','Travel Hours','Total Hours','Notes']];
  data.shifts.forEach(s=>rows.push([isoLocal(s.start),s.production,s.role,s.location,fmtTime(s.start),fmtTime(s.end),(s.breaks||[]).reduce((n,b)=>n+hoursBetween(b.start,b.end),0).toFixed(2),s.travel||0,shiftHours(s).toFixed(2),s.notes||'']));
  download('SetHours_Timesheet.csv',rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n'),'text/csv')
}
function download(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function backup(){download('SetHours_Backup.json',JSON.stringify(data,null,2),'application/json')}
function exportWeek(){showView('timesheetView');setTimeout(()=>window.print(),100)}
$$('.bottom-nav button').forEach(b=>b.onclick=()=>showView(b.dataset.view));$$('[data-nav]').forEach(b=>b.onclick=()=>showView(b.dataset.nav+'View'));$$('[data-edit]').forEach(b=>b.onclick=()=>editCurrent(b.dataset.edit));
$('#clockInBtn').onclick=clockIn;$('#clockOutBtn').onclick=clockOut;$('#breakBtn').onclick=toggleBreak;$('#travelBtn').onclick=addTravel;$('#openSettings').onclick=settings;$('#quickAdd').onclick=addManual;
$('#manualShiftBtn').onclick=addManual;$('#addProductionBtn').onclick=addProduction;$('#prevWeek').onclick=()=>{selectedMonday.setDate(selectedMonday.getDate()-7);render()};$('#nextWeek').onclick=()=>{selectedMonday.setDate(selectedMonday.getDate()+7);render()};
$('#exportBtn').onclick=exportWeek;$('#printBtn').onclick=exportWeek;$('#exportCsvBtn').onclick=exportCsv;$('#backupBtn').onclick=backup;
$('#restoreInput').onchange=async e=>{try{data=JSON.parse(await e.target.files[0].text());saveData();render();toast('Backup restored')}catch{alert('Could not restore this backup.')}};
$('#clearDataBtn').onclick=()=>{if(confirm('Delete all SetHours data on this device?')){localStorage.removeItem(STORE);data=structuredClone(defaultData);saveData();render()}};
setInterval(tick,1000);render();tick();
if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js');
