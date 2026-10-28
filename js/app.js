
const CONFIG_KEY='agenda-ipia-config-v1';
const AUTO_BACKUP_KEY='agenda-ipia-auto-backups-v1';
const SAFETY_BACKUP_KEY='agenda-ipia-pre-restore-v1';
const defaultConfig={subjects:[],commitments:[],classes:[],rooms:[],notes:[],eventStyle:{background:'#f0e9fb',todayBorder:'#e8a43a'}};
function normalizeConfig(v){const result=JSON.parse(JSON.stringify(defaultConfig));if(!v||typeof v!=='object')return result;for(const k of ['subjects','commitments','classes','rooms','notes'])if(Array.isArray(v[k])){const seen=new Set();result[k]=v[k].filter(x=>{const n=typeof x==='string'?x:x?.name;const valid=typeof n==='string'&&n.trim().length>0&&!seen.has(n.trim().toLowerCase());if(valid)seen.add(n.trim().toLowerCase());return valid}).slice(0,80).map(x=>k==='subjects'||k==='classes'?{name:String(x.name).slice(0,60),color:/^#[0-9a-f]{6}$/i.test(x.color)?x.color:(k==='subjects'?'#eaf2fc':'#dcebff')}:String(x).slice(0,100))}if(v.eventStyle&&typeof v.eventStyle==='object'){for(const k of ['background','todayBorder'])if(typeof v.eventStyle[k]==='string'&&/^#[0-9a-f]{6}$/i.test(v.eventStyle[k]))result.eventStyle[k]=v.eventStyle[k]}return result}
let config=normalizeConfig(null);try{config=normalizeConfig(JSON.parse(localStorage.getItem(CONFIG_KEY)||'null'))}catch(e){}
function saveConfig(){beforeAgendaChange();localStorage.setItem(CONFIG_KEY,JSON.stringify(config));window.dispatchEvent(new Event('agenda-local-changed'));populateChoices();renderSettings();render()}
function findColor(group,name,fallback){return config[group].find(x=>x.name===name)?.color||fallback}
function inkFor(bg){if(!/^#[0-9a-f]{6}$/i.test(bg))return '#1e293b';const rgb=[1,3,5].map(i=>parseInt(bg.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.19?'#253348':'#ffffff'}
function styleColor(bg){return 'background:'+bg+';color:'+inkFor(bg)+';border-color:'+bg}
function populateChoices(){const refill=(id,items)=>{const el=$(id),old=el.value;el.innerHTML='';for(const item of items)el.add(new Option(item.name,item.name));if(old&&old!=='__custom__'&&!items.some(x=>x.name===old))el.add(new Option(old+' (già usato)',old));if(old&&old!=='__custom__')el.value=old;else if(!items.length)el.value='__custom__'};refill('lessonSubject',config.subjects);$('lessonSubject').add(new Option('Altro (scrivi...)','__custom__'));refill('lessonClass',config.classes);$('lessonClass').add(new Option('Altro (scrivi...)','__custom__'));if(!config.subjects.length)$('lessonSubject').value='__custom__';if(!config.classes.length)$('lessonClass').value='__custom__';const event=$('subject'),oldEvent=event.value;event.innerHTML='<option value="">Seleziona un impegno</option>';config.commitments.forEach(x=>event.add(new Option(x,x)));event.add(new Option('Altro (scrivi...)','__custom__'));if(oldEvent&&Array.from(event.options).some(o=>o.value===oldEvent))event.value=oldEvent;const eventClass=$('classroom'),oldClass=eventClass.value;eventClass.innerHTML='<option value="">Nessuna classe</option>';config.classes.forEach(x=>eventClass.add(new Option(x.name,x.name)));eventClass.add(new Option('Altro (scrivi...)','__custom__'));if(oldClass&&Array.from(eventClass.options).some(o=>o.value===oldClass))eventClass.value=oldClass;const room=$('room'),oldRoom=room.value;room.innerHTML='<option value="">Nessuna aula / luogo</option>';config.rooms.forEach(x=>room.add(new Option(x,x)));room.add(new Option('Altro (scrivi...)','__custom__'));if(oldRoom&&Array.from(room.options).some(o=>o.value===oldRoom))room.value=oldRoom;const n=$('presetNote'),prev=n.value;n.innerHTML='<option value="">Nota libera / nessuna nota</option>';config.notes.forEach(x=>n.add(new Option(x,x)));n.value=prev&&config.notes.includes(prev)?prev:''}
function toggleCustomLessonSubject(){const custom=$('lessonSubject').value==='__custom__';$('customLessonSubject').style.display=custom?'block':'none';$('customLessonSubject').required=custom&&$('type').value==='lesson';if(!custom)$('customLessonSubject').value=''}function toggleCustomLessonClass(){const custom=$('lessonClass').value==='__custom__';$('customLessonClass').style.display=custom?'block':'none';$('customLessonClass').required=custom&&$('type').value==='lesson';if(!custom)$('customLessonClass').value=''}function setLessonChoice(id,customId,value){const el=$(id);if(!value){el.value=el.options[0]?.value||'';$(customId).value=''}else if(Array.from(el.options).some(o=>o.value===value)){el.value=value;$(customId).value=''}else{el.value='__custom__';$(customId).value=value}if(id==='lessonSubject')toggleCustomLessonSubject();else toggleCustomLessonClass()}function toggleCustomCommitment(){const custom=$('subject').value==='__custom__';$('customCommitment').required=custom&&$('type').value==='event';$('customCommitment').style.display=custom?'block':'none';if(!custom)$('customCommitment').value=''}function setCommitment(value){const el=$('subject');if(!value){el.value='';$('customCommitment').value=''}else if(Array.from(el.options).some(o=>o.value===value)){el.value=value;$('customCommitment').value=''}else{el.value='__custom__';$('customCommitment').value=value}toggleCustomCommitment()}function toggleCustomClass(){const custom=$('classroom').value==='__custom__';$('customClass').style.display=custom?'block':'none';if(!custom)$('customClass').value=''}function setEventClass(value){const el=$('classroom');if(!value){el.value='';$('customClass').value=''}else if(Array.from(el.options).some(o=>o.value===value)){el.value=value;$('customClass').value=''}else{el.value='__custom__';$('customClass').value=value}toggleCustomClass()}function toggleCustomRoom(){const custom=$('room').value==='__custom__';$('customRoom').style.display=custom?'block':'none';if(!custom)$('customRoom').value=''}function setRoom(value){const room=$('room');if(!value){room.value='';$('customRoom').value=''}else if(Array.from(room.options).some(o=>o.value===value)){room.value=value;$('customRoom').value=''}else{room.value='__custom__';$('customRoom').value=value}toggleCustomRoom()}function choosePresetNote(){if($('presetNote').value)$('note').value=$('presetNote').value}
function renderSettings(){const labels={subjects:'Materie',commitments:'Tipi di impegno',classes:'Classi',rooms:'Aule e laboratori',notes:'Note predefinite'};let html='';for(const group of ['subjects','commitments','classes','rooms','notes']){html+='<div class="setting-group"><h3>'+labels[group]+'</h3>';if(!config[group].length)html+='<p class="setting-empty">Nessuna voce inserita. Scrivi qui sotto per aggiungerne una.</p>';config[group].forEach((item,i)=>{const obj=group==='subjects'||group==='classes';const value=obj?item.name:item;html+='<div class="setting-line"><input type="text" aria-label="'+labels[group]+' '+(i+1)+'" maxlength="100" value="'+safe(value)+'" data-setting="'+group+'" data-index="'+i+'" data-field="name">'+(obj?'<input type="color" aria-label="Colore '+safe(value)+'" value="'+item.color+'" data-setting="'+group+'" data-index="'+i+'" data-field="color">':'')+'<button type="button" class="danger small" data-delete="'+group+'" data-index="'+i+'" aria-label="Elimina '+safe(value)+'">×</button></div>'});html+='<div class="setting-add"><input type="text" maxlength="100" id="new-'+group+'" placeholder="Aggiungi '+labels[group].toLowerCase()+'"><button type="button" data-add="'+group+'">＋</button></div></div>'}$('personalization').innerHTML=html;$('eventBackground').value=config.eventStyle.background;$('eventTodayBorder').value=config.eventStyle.todayBorder;const prompt=$('setupMessage');if(prompt)prompt.hidden=!!(config.subjects.length&&config.classes.length)}
function changeEventColor(field,value){if(!['background','todayBorder'].includes(field)||!/^#[0-9a-f]{6}$/i.test(value))return;config.eventStyle[field]=value;saveConfig()}
function changeSetting(group,index,field,value){const arr=config[group];if(!arr||!arr[index])return;if(field==='color'){if(/^#[0-9a-f]{6}$/i.test(value))arr[index].color=value}else{value=value.trim();if(!value)return;const duplicate=arr.some((x,i)=>i!==index&&(typeof x==='string'?x:x.name).toLowerCase()===value.toLowerCase());if(duplicate){alert('Questa voce esiste già.');renderSettings();return}const previousName=typeof arr[index]==='string'?arr[index]:arr[index].name;if(previousName!==value&&['subjects','classes','rooms'].includes(group)){const fieldName=group==='subjects'?'subject':group==='classes'?'classroom':'room';const updated=data.map(entry=>(group==='rooms'||entry.type==='lesson')&&entry[fieldName]===previousName?{...entry,[fieldName]:value}:entry);if(updated.some((entry,i)=>entry!==data[i])){try{beforeAgendaChange();localStorage.setItem(KEY,JSON.stringify(updated))}catch(e){alert('Impossibile salvare le voci aggiornate. Riprova dopo aver liberato spazio.');renderSettings();return}data=updated}}if(typeof arr[index]==='string')arr[index]=value;else arr[index].name=value}saveConfig()}
function addSetting(group){const input=$('new-'+group),value=input.value.trim();if(!value)return;if(config[group].some(x=>(typeof x==='string'?x:x.name).toLowerCase()===value.toLowerCase())){alert('Questa voce esiste già.');return}if(['subjects','classes'].includes(group))config[group].push({name:value,color:group==='subjects'?'#eaf2fc':'#dcebff'});else config[group].push(value);saveConfig()}
document.getElementById('personalization').addEventListener('change',e=>{const t=e.target;if(t.dataset.setting)changeSetting(t.dataset.setting,Number(t.dataset.index),t.dataset.field,t.value)});
document.getElementById('personalization').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.add)addSetting(b.dataset.add);if(b.dataset.delete&&confirm('Eliminare questa voce dall’elenco? Le lezioni già inserite rimarranno salvate.')){config[b.dataset.delete].splice(Number(b.dataset.index),1);saveConfig()}});
const KEY='agenda-docente-v2';function setupTimes(){refreshTimes()};function refreshTimes(){const lesson=$('type').value==='lesson';for(const id of ['start','end']){const el=$(id),previous=el.value;el.innerHTML='';if(lesson){for(let h=8;h<=13;h++){const begin=(h===8?'08:20':String(h).padStart(2,'0')+':20');const finish=String(h+1).padStart(2,'0')+':20';const t=id==='start'?begin:finish;el.add(new Option(t,t))}el.disabled=false}else{el.disabled=false;for(let h=0;h<24;h++)for(let m=0;m<60;m+=10){const t=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');el.add(new Option(t,t))}}if(previous&&Array.from(el.options).some(o=>o.value===previous))el.value=previous;else if(id==='end'&&lesson)el.value='09:20';}};function updateEndFromStart(){if($('type').value==='event'){const start=$('start').value;const [h,m]=start.split(':').map(Number);if(!Number.isInteger(h)||!Number.isInteger(m))return;const minutes=h*60+m+60;if(minutes>=1440){$('end').value='23:50';return}const end=String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');if(Array.from($('end').options).some(o=>o.value===end))$('end').value=end;return}const starts=['08:20','09:20','10:20','11:20','12:20','13:20'];const ends=['09:20','10:20','11:20','12:20','13:20','14:20'];const i=starts.indexOf($('start').value);if(i>=0)$('end').value=ends[i]}function setTime(id,value){const el=$(id);if(value&&!Array.from(el.options).some(o=>o.value===value))el.add(new Option(value+' (precedente)',value));el.value=value||(id==='start'?'08:20':'09:20')};const days=['','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];const $=id=>document.getElementById(id);$('start').addEventListener('change',updateEndFromStart);let data=[];let editing=null;try{const stored=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(stored))data=stored}catch(e){}// Per installazioni già in uso senza configurazione salvata, recupera le voci dalle lezioni esistenti.
// Una nuova installazione parte invece senza alcuna voce predefinita.
if(!localStorage.getItem(CONFIG_KEY)&&data.some(x=>x.type==='lesson')){
 const previousSubjectColors={'LTE':'#fff0b8','TTIMD':'#e2f4e7'};
 const previousClassColors={'2ªA MAT':'#dcebff','4ªA MAT':'#ffe0d5','4ªB MAT':'#f0deff'};
 const subjects=[...new Set(data.filter(x=>x.type==='lesson').map(x=>x.subject).filter(Boolean))];
 const classes=[...new Set(data.filter(x=>x.type==='lesson').map(x=>x.classroom).filter(Boolean))];
 config.subjects=subjects.map(name=>({name,color:previousSubjectColors[name]||'#eaf2fc'}));
 config.classes=classes.map(name=>({name,color:previousClassColors[name]||'#dcebff'}));
 beforeAgendaChange();localStorage.setItem(CONFIG_KEY,JSON.stringify(config));
}
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function save(){beforeAgendaChange();localStorage.setItem(KEY,JSON.stringify(data));window.dispatchEvent(new Event('agenda-local-changed'));render()};function navigate(page){document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===page));document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===page));$('heading').textContent=({today:'Oggi',week:'Settimana',commitments:'Impegni',month:'Mese',settings:'Impostazioni',editor:'Modifica agenda'})[page];window.scrollTo(0,0);if(page==='settings'){renderSettings();renderBackupList();}if(page!=='editor')render()};function card(x,highlightToday=false,showActivity=false){const now=new Date(),today=localDate(),minute=now.getHours()*60+now.getMinutes(),toMin=t=>{const [h,m]=String(t).split(':').map(Number);return h*60+m},active=showActivity&&(x.type==='lesson'||x.date===today)&&toMin(x.start)<=minute&&minute<toMin(x.end),progress=active?Math.max(0,Math.min(100,Math.round(100*(minute-toMin(x.start))/(toMin(x.end)-toMin(x.start))))):0;const activityMarkup=active?`<div class="inline-activity"><span>◷ In corso · ${toMin(x.end)-minute} min rimanenti</span><div class="inline-progress"><div style="width:${progress}%"></div></div></div>`:'';const todayEvent=x.type==='event'&&highlightToday;const style=x.type==='lesson'?styleColor(findColor('subjects',x.subject,'#eaf2fc')):'background:'+config.eventStyle.background+';border-color:'+(todayEvent?config.eventStyle.todayBorder:config.eventStyle.background)+';--today-border:'+config.eventStyle.todayBorder;return `<div class="card ${x.type==='lesson'?'personal-lesson':'school-event'}${todayEvent?' event-today':''}" style="${style}"><div class="time">${safe(x.start)}<br>${safe(x.end)}</div><div class="content">${todayEvent?'<span class="today-label">OGGI</span>':''}<strong>${safe(x.subject)}</strong>${x.classroom||x.room?`<div class="meta">${x.classroom?(x.type==='lesson'?'<span class="class-badge" style="'+styleColor(findColor('classes',x.classroom,'#eaf2fc'))+'">'+safe(x.classroom)+'</span>':'Classe '+safe(x.classroom)):''}${x.classroom&&x.room?' · ':''}${x.room?safe(x.room):''}</div>`:''}${x.note?`<div class="note">✎ ${safe(x.note)}</div>`:''}${activityMarkup}</div><div class="actions"><button class="small" data-action="edit" data-id="${safe(x.id)}" aria-label="Modifica">✎</button><button class="small" data-action="duplicate" data-id="${safe(x.id)}" aria-label="Duplica" title="Duplica">⧉</button><button class="small danger" data-action="remove" data-id="${safe(x.id)}" aria-label="Elimina">×</button></div></div>`};function list(a,showActivity=false){return a.length?a.sort((x,y)=>x.start.localeCompare(y.start)).map(x=>card(x,false,showActivity)).join(''):'<div class="empty">Nessuna voce inserita.</div>'};function lessonHours(entry){
 const toMinutes=t=>{const m=/^(\d{2}):(\d{2})$/.exec(t||'');return m?Number(m[1])*60+Number(m[2]):NaN};
 const minutes=toMinutes(entry.end)-toMinutes(entry.start);
 return Number.isFinite(minutes)&&minutes>0?minutes/60:0;
}
function formatHours(hours){return Number(hours.toFixed(2)).toLocaleString('it-IT',{maximumFractionDigits:2})}
function render(){const now=new Date(),dow=now.getDay(),date=localDate();$('todayDate').textContent=now.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});const lessons=data.filter(x=>x.type==='lesson'&&!closureFor(date)&&Number(x.day)===dow);const currentTime=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');const extras=data.filter(x=>x.type==='event'&&x.date&&(x.date>date||(x.date===date&&(x.end||x.start||'00:00')>=currentTime))).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));const lessonTotal=lessons.reduce((total,x)=>total+lessonHours(x),0);const lc=$('lc'),ec=$('ec');lc.hidden=lessonTotal<=0;lc.textContent=lessonTotal>0?'· '+formatHours(lessonTotal)+' ore':'';ec.hidden=extras.length===0;ec.textContent=extras.length?'· '+extras.length:'';$('todayLessons').innerHTML=closureFor(date)?'<div class="closure-banner">📅 '+safe(closureFor(date))+' — lezioni sospese</div>':list(lessons,true);$('todayExtras').innerHTML=extras.length?extras.map((x,i)=>`${i===0||extras[i-1].date!==x.date?`<div class="muted" style="margin-top:18px">${safe(new Date(x.date+'T12:00:00').toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}</div>`:''}${card(x,x.date===date,true)}`).join(''):'<div class="empty">Nessun impegno in programma.</div>';$('weekList').innerHTML=renderWeekTable();const all=data.filter(x=>x.type==='event');
const eventIsUpcoming=x=>x.date>date||(x.date===date&&(x.end||x.start||'00:00')>=currentTime);
const upcoming=all.filter(eventIsUpcoming).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
const history=all.filter(x=>!eventIsUpcoming(x)).sort((a,b)=>b.date.localeCompare(a.date)||b.start.localeCompare(a.start));
const renderEventGroups=items=>{let previousDate='';return items.map(x=>{const label=x.date!==previousDate?'<div class="muted" style="margin-top:18px">'+safe(new Date(x.date+'T12:00:00').toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'}))+'</div>':'';previousDate=x.date;return label+card(x)}).join('')};
$('commitmentList').innerHTML=all.length?'<h2 class="today-section-heading">In programma'+(upcoming.length?' <span class="today-section-count">· '+upcoming.length+'</span>':'')+'</h2>'+(upcoming.length?renderEventGroups(upcoming):'<div class="empty">Nessun impegno futuro.</div>')+(history.length?'<h2 class="today-section-heading" style="margin-top:28px">Impegni passati <span class="today-section-count">· '+history.length+'</span></h2>'+renderEventGroups(history):''):'<div class="empty">Nessun impegno inserito.</div>';renderMonth()};
let monthShown=new Date(new Date().getFullYear(),new Date().getMonth(),1);
let monthDay=new Date().getDate();
function shiftMonth(n){monthShown=new Date(monthShown.getFullYear(),monthShown.getMonth()+n,1);monthDay=1;renderMonth()}
function selectMonthDay(n){monthDay=n;renderMonth()}

const CLOSURES_KEY='agenda-ipia-closures-v1';
function normalizeClosures(v){if(!Array.isArray(v))return [];return v.filter(x=>x&&typeof x.name==='string'&&x.name.trim()&&validDate(x.start)&&validDate(x.end)&&x.start<=x.end).slice(0,300).map(x=>({name:x.name.trim().slice(0,100),start:x.start,end:x.end}))}
let closures=[];try{closures=normalizeClosures(JSON.parse(localStorage.getItem(CLOSURES_KEY)||'[]'))}catch(e){}
function easterDate(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k+7)%7,m=Math.floor((a+11*h+22*l)/451),p=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;return new Date(y,p-1,day)}
function holidayFor(iso){const [y,m,d]=iso.split('-').map(Number);const fixed={'01-01':'Capodanno','01-06':'Epifania','04-25':'Festa della Liberazione','05-01':'Festa del Lavoro','06-02':'Festa della Repubblica','08-15':'Ferragosto','11-01':'Ognissanti','12-08':'Immacolata Concezione','12-25':'Natale','12-26':'Santo Stefano'};const fixedName=fixed[iso.slice(5)];if(fixedName)return fixedName;const easter=easterDate(y);const isoDate=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');if(iso===isoDate(easter))return 'Pasqua';easter.setDate(easter.getDate()+1);return iso===isoDate(easter)?'Lunedì dell’Angelo':null}
function closureFor(iso){const manual=closures.find(x=>x.start<=iso&&x.end>=iso);return manual?manual.name:holidayFor(iso)}
function saveClosures(){beforeAgendaChange();localStorage.setItem(CLOSURES_KEY,JSON.stringify(closures));window.dispatchEvent(new Event('agenda-local-changed'));render();renderClosures()}
function addClosure(e){e.preventDefault();const name=$('closureName').value.trim(),start=$('closureStart').value,end=$('closureEnd').value;if(!name||!validDate(start)||!validDate(end)||end<start){alert('Controlla il motivo e le date.');return}closures.push({name:name.slice(0,100),start,end});closures.sort((a,b)=>a.start.localeCompare(b.start));saveClosures();$('closureForm').reset()}
function deleteClosure(i){if(!confirm('Eliminare questa sospensione?'))return;closures.splice(i,1);saveClosures()}
function renderClosures(){const el=$('closureList');if(!el)return;el.innerHTML=closures.length?closures.map((x,i)=>'<div class="closure-row"><span><strong>'+safe(x.name)+'</strong><small>'+safe(x.start)+(x.end!==x.start?' → '+safe(x.end):'')+'</small></span><button type="button" class="danger small" onclick="deleteClosure('+i+')">Elimina</button></div>').join(''):'<p class="hint">Nessuna sospensione personalizzata.</p>'}

function entriesForMonthDay(n){
 const d=new Date(monthShown.getFullYear(),monthShown.getMonth(),n);
 const iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(n).padStart(2,'0');
 return data.filter(x=>(x.type==='lesson'&&!closureFor(iso)&&Number(x.day)===d.getDay())||(x.type==='event'&&x.date===iso)).sort((a,b)=>(a.start||'').localeCompare(b.start||''));
}
function renderMonth(){
 const grid=$('monthGrid');if(!grid)return;
 const y=monthShown.getFullYear(),m=monthShown.getMonth(),length=new Date(y,m+1,0).getDate(),offset=(new Date(y,m,1).getDay()+6)%7;
 const today=new Date();
 $('monthTitle').textContent=monthShown.toLocaleDateString('it-IT',{month:'long',year:'numeric'});const legendEventDot=$('monthLegendEventDot');if(legendEventDot)legendEventDot.style.backgroundColor=config.eventStyle.background;
 let html=['L','M','M','G','V','S','D'].map(x=>'<div class="month-weekday">'+x+'</div>').join('');
 for(let i=0;i<offset;i++)html+='<div class="month-empty"></div>';
 for(let n=1;n<=length;n++){
  const entries=entriesForMonthDay(n),lesson=entries.some(x=>x.type==='lesson'),event=entries.some(x=>x.type==='event');
  const closed=closureFor(y+'-'+String(m+1).padStart(2,'0')+'-'+String(n).padStart(2,'0'));const isToday=y===today.getFullYear()&&m===today.getMonth()&&n===today.getDate();
  html+='<button type="button" class="month-day'+(n===monthDay?' selected':'')+(isToday?' is-today':'')+(closed?' is-closed':'')+'" onclick="selectMonthDay('+n+')" aria-label="Giorno '+n+'"><span>'+n+'</span><span class="month-dots">'+(closed?'<span class="closed-mark" aria-label="Sospensione">×</span>':lesson?'<i class="lesson-dot"></i>':'')+(event?'<i class="event-dot" style="background:'+config.eventStyle.background+'"></i>':'')+'</span></button>';
 }
 grid.innerHTML=html;
 const d=new Date(y,m,monthDay);
 $('monthDayTitle').textContent=d.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});
 const entries=entriesForMonthDay(monthDay);
 const closed=closureFor(y+'-'+String(m+1).padStart(2,'0')+'-'+String(monthDay).padStart(2,'0'));$('monthEntries').innerHTML=(closed?'<div class="closure-banner">📅 '+safe(closed)+' — lezioni sospese</div>':'')+(entries.length?entries.map(x=>card(x)).join(''):'<div class="empty">Nessuna attività prevista per questo giorno.</div>');
}
function renderWeekTable(){
 const lessons=data.filter(x=>x.type==='lesson');
 if(!lessons.length)return '<div class="empty">Nessuna lezione settimanale inserita.</div>';
 const weekdays=lessons.some(x=>Number(x.day)===6)?[1,2,3,4,5,6]:[1,2,3,4,5];
 const starts=['08:20','09:20','10:20','11:20','12:20','13:20'];
 const endings=['09:20','10:20','11:20','12:20','13:20','14:20'];
 const extra=lessons.map(x=>x.start).filter(t=>t&&!starts.includes(t));
 const slots=[...new Set([...starts,...extra])].sort();
 const currentWeekday=new Date().getDay();
 const head='<thead><tr><th scope="col">Ora</th>'+weekdays.map(d=>'<th scope="col"'+(d===currentWeekday?' class="week-current-day week-today-top" aria-current="date"':'')+'>'+safe(days[d])+'</th>').join('')+'</tr></thead>';
 // Una cella che copre più fasce orarie usa rowspan; le righe successive
 // non creano un'altra cella nello stesso giorno.
 const occupied=Object.fromEntries(weekdays.map(d=>[d,new Set()]));
 const lessonButton=x=>{
   const cls=styleColor(findColor('classes',x.classroom,'#eaf2fc'));
   const typ=styleColor(findColor('subjects',x.subject,'#eaf2fc'));
   const label=[x.subject,x.classroom,x.start+'–'+x.end,x.room,x.note].filter(Boolean).join(', ');
   return '<button type="button" class="week-lesson" style="'+typ+'" data-entry-id="'+safe(x.id)+'" aria-label="Modifica '+safe(label)+'"><span class="week-subject">'+safe(x.subject)+'</span>'+(x.classroom?'<span class="week-class" style="'+cls+'">'+safe(x.classroom)+'</span>':'')+(x.room?'<span class="week-room">'+safe(x.room)+'</span>':'')+'</button>';
 };
 const rows=slots.map((start,i)=>{
   const idx=starts.indexOf(start),end=idx>=0?endings[idx]:'';
   const label='<div class="week-time"><strong>'+safe(start)+'</strong>'+(end?'<div>'+safe(end)+'</div>':'')+'</div>';
   const cells=weekdays.map(day=>{
     if(occupied[day].has(i))return '';
     const matches=lessons.filter(x=>Number(x.day)===day&&x.start===start).sort((a,b)=>xEnd(a).localeCompare(xEnd(b)));
     if(!matches.length)return '<td'+(day===currentWeekday?' class="week-today-cell'+(i===slots.length-1?' week-today-bottom':'')+'"':'')+'><span class="week-empty">—</span></td>';
     // Non unire righe quando nello stesso giorno inizia un'altra lezione:
     // in caso di sovrapposizioni, tutte le lezioni restano accessibili.
     let span=1;
     if(matches.length===1){
       const x=matches[0];
       for(let j=i+1;j<slots.length;j++){
         if(slots[j]>=x.end)break;
         if(lessons.some(y=>Number(y.day)===day&&y.start===slots[j]))break;
         span++;
       }
     }
     for(let j=i+1;j<i+span;j++)occupied[day].add(j);
     return '<td'+(span>1?' rowspan="'+span+'"':'')+' class="'+(span>1?'week-spanning ':'')+(day===currentWeekday?'week-today-cell'+(i+span===slots.length?' week-today-bottom':''):'')+'"'+(span>1?' style="--lesson-span-height:'+(76*span-6)+'px"':'')+'><div class="week-cell">'+matches.map(lessonButton).join('')+'</div></td>';
   }).join('');
   return '<tr><td>'+label+'</td>'+cells+'</tr>';
 }).join('');
 return '<div class="week-scroll" tabindex="0" aria-label="Tabella orario settimanale, scorri orizzontalmente"><table class="week-table">'+head+'<tbody>'+rows+'</tbody></table></div>';
}
function xEnd(x){return x.end||''}
$('weekList').addEventListener('click',e=>{const b=e.target.closest('[data-entry-id]');if(b)editEntry(b.dataset.entryId)});
document.addEventListener('click',e=>{const b=e.target.closest('button[data-action][data-id]');if(!b)return;const id=b.dataset.id;if(b.dataset.action==='edit')editEntry(id);else if(b.dataset.action==='duplicate')duplicateEntry(id);else if(b.dataset.action==='remove')removeEntry(id)});
function toggleFields(){const lesson=$('type').value==='lesson';$('weeklyFields').style.display=lesson?'block':'none';$('dateFields').style.display=lesson?'none':'block';$('date').required=!lesson;$('subjectLabel').textContent=lesson?'Materia':'Impegno';$('subjectLabel').htmlFor=lesson?'lessonSubject':'subject';$('lessonSubject').style.display=lesson?'block':'none';$('customLessonSubject').style.display=lesson&&$('lessonSubject').value==='__custom__'?'block':'none';$('customLessonSubject').required=lesson&&$('lessonSubject').value==='__custom__';$('customLessonClass').style.display=lesson&&$('lessonClass').value==='__custom__'?'block':'none';$('customLessonClass').required=lesson&&$('lessonClass').value==='__custom__';$('subject').style.display=lesson?'none':'block';$('subject').required=!lesson;$('customCommitment').required=!lesson&&$('subject').value==='__custom__';$('lessonClass').style.display=lesson?'block':'none';$('classroom').style.display=lesson?'none':'block';refreshTimes();const reminders=$('reminderField');if(reminders)reminders.style.display=lesson?'none':'block'};function openForm(id){editing=null;$('entryForm').reset();$('reminder').value='5';populateChoices();setRoom('');setEventClass('');setCommitment('');$('customLessonSubject').value='';$('customLessonClass').value='';$('presetNote').value='';setTime('start','08:20');setTime('end','09:20');$('date').value=localDate();$('day').value=String(new Date().getDay()||1);$('formHeading').textContent='Nuova voce';toggleFields();toggleCustomLessonSubject();toggleCustomLessonClass();navigate('editor')};function setSelectChoice(id,value){const el=$(id);if(value&&!Array.from(el.options).some(o=>o.value===value))el.add(new Option(value+' (già usato)',value));if(value)el.value=value}function editEntry(id){const x=data.find(x=>x.id===id);if(!x)return;editing=id;for(const k of ['type','day','date','classroom','note'])$(k).value=x[k]||'';populateChoices();setEventClass(x.classroom||'');setRoom(x.room||'');setLessonChoice('lessonClass','customLessonClass',x.type==='lesson'?x.classroom:'');setCommitment(x.type==='event'?x.subject||'':'');setLessonChoice('lessonSubject','customLessonSubject',x.type==='lesson'?x.subject:'');$('presetNote').value=config.notes.includes(x.note)?x.note:'';$('formHeading').textContent='Modifica voce';toggleFields();setTime('start',x.start);setTime('end',x.end);$('reminder').value=x.type==='event'?(String(x.reminder)==='off'?'off':'5'):'off';navigate('editor')};function conflictsFor(x){
 const overlaps=y=>x.start<y.end&&y.start<x.end;
 return data.filter(y=>y.id!==x.id&&overlaps(y)&&(
  x.type==='event'?(y.type==='event'&&y.date===x.date||y.type==='lesson'&&!closureFor(x.date)&&Number(y.day)===new Date(x.date+'T12:00:00').getDay()):
  (y.type==='lesson'&&String(y.day)===String(x.day))
 ));
}
function conflictMessage(x,conflicts){
 const label=x.type==='event'?'impegno':'lezione';
 return 'Attenzione: '+label+' sovrapposto a '+conflicts.length+' attività già presenti:\n\n'+conflicts.map(y=>'• '+y.subject+(y.classroom?' ('+y.classroom+')':'')+' — '+y.start+'–'+y.end).join('\n')+'\n\nVuoi salvare comunque?';
}
function duplicateEntry(id){const x=data.find(entry=>entry.id===id);if(!x)return;editEntry(id);editing=null;$('formHeading').textContent=x.type==='lesson'?'Duplica lezione':'Duplica impegno';};$('entryForm').addEventListener('submit',e=>{e.preventDefault();const x={id:editing||String(Date.now())+Math.random().toString(36).slice(2),type:$('type').value,day:$('day').value,date:$('date').value,start:$('start').value,end:$('end').value,subject:$('type').value==='lesson'?($('lessonSubject').value==='__custom__' ? $('customLessonSubject').value : $('lessonSubject').value).trim():($('subject').value==='__custom__' ? $('customCommitment').value : $('subject').value).trim(),classroom:$('type').value==='lesson'?($('lessonClass').value==='__custom__' ? $('customLessonClass').value : $('lessonClass').value).trim():($('classroom').value==='__custom__' ? $('customClass').value : $('classroom').value).trim(),room:($('room').value==='__custom__' ? $('customRoom').value : $('room').value).trim(),note:$('note').value.trim(),reminder:$('type').value==='event'?$('reminder').value:'off'};if(x.type==='lesson'){if(!config.subjects.length||!config.classes.length){alert('Per inserire una lezione configura prima materie e classi nelle Impostazioni.');navigate('settings');$('setupMessage').hidden=false;return}if(!x.classroom){alert('Seleziona una classe.');return}const valid=['08:20','09:20','10:20','11:20','12:20','13:20'];if(!valid.includes(x.start)){alert('Seleziona un orario di inizio valido.');return}}if(x.end<=x.start){alert('L’orario di fine deve essere successivo a quello di inizio.');return}if(!x.subject){alert('Inserisci materia o impegno.');return}const additions=[];if(x.type==='lesson'&&$('lessonSubject').value==='__custom__')additions.push(['subjects',x.subject]);if(x.type==='lesson'&&$('lessonClass').value==='__custom__')additions.push(['classes',x.classroom]);if(x.type==='event'&&$('subject').value==='__custom__')additions.push(['commitments',x.subject]);if(x.type==='event'&&$('classroom').value==='__custom__')additions.push(['classes',x.classroom]);if($('room').value==='__custom__')additions.push(['rooms',x.room]);let configChanged=false;for(const [group,value] of additions){if(!value||config[group].some(item=>(typeof item==='string'?item:item.name).toLocaleLowerCase('it')===value.toLocaleLowerCase('it')))continue;if(config[group].length>=80)continue;if(group==='classes'||group==='subjects')config[group].push({name:value,color:group==='subjects'?'#eaf2fc':'#dcebff'});else config[group].push(value);configChanged=true}const conflicts=conflictsFor(x);if(conflicts.length&&!confirm(conflictMessage(x,conflicts)))return;if(configChanged)saveConfig();if(editing)data=data.map(y=>y.id===editing?x:y);else data.push(x);save();navigate(x.type==='lesson'?'week':'commitments')});function removeEntry(id){if(confirm('Eliminare questa voce?')){data=data.filter(x=>x.id!==id);save()}}function clearData(){if(confirm('Vuoi cancellare definitivamente tutti i dati?')){data=[];save();navigate('today')}}function exportConfig(){const b=new Blob([JSON.stringify(config,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='agenda-ipia-personalizzazioni.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}function importConfig(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const obj=JSON.parse(r.result);if(!obj||typeof obj!=='object'||!Array.isArray(obj.subjects)||!Array.isArray(obj.classes))throw Error();if(confirm('Sostituire gli elenchi personalizzati? Le lezioni resteranno salvate.')){config=normalizeConfig(obj);saveConfig()}}catch(err){alert('File personalizzazioni non valido.')}};r.readAsText(f);e.target.value=''}function exportData(){
  try{
    const backup={format:'agenda-ipia-backup',schema:1,exportedAt:new Date().toISOString(),appVersion:APP_VERSION,entries:data,personalization:config,closures};
    const b=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');
    a.href=url;a.download='agenda-ipia-backup-'+localDate()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(err){alert('Impossibile esportare il backup: '+err.message)}
}
function validTime(value){if(typeof value!=='string'||!/^\d{2}:\d{2}$/.test(value))return false;const [h,m]=value.split(':').map(Number);return h>=0&&h<=23&&m>=0&&m<=59}
function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number);const date=new Date(y,m-1,d);return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d}
function validEntries(arr){if(!Array.isArray(arr)||arr.length>20000)return false;const ids=new Set();return arr.every(x=>{if(!x||typeof x!=='object'||typeof x.id!=='string'||!x.id||x.id.length>100||ids.has(x.id)||!['lesson','event'].includes(x.type)||typeof x.subject!=='string'||!x.subject.trim()||!validTime(x.start)||!validTime(x.end)||x.end<=x.start)return false;ids.add(x.id);return x.type==='lesson'?['1','2','3','4','5','6'].includes(String(x.day)):(validDate(x.date))})}
function validPersonalization(v){return v&&typeof v==='object'&&!Array.isArray(v)&&['subjects','classes','rooms','notes'].every(k=>Array.isArray(v[k])&&v[k].length<=80&&v[k].every(x=>(k==='subjects'||k==='classes')?(x&&typeof x.name==='string'&&typeof x.color==='string'):typeof x==='string'))}
function importData(e){
 const f=e.target.files?.[0];e.target.value='';if(!f)return;
 if(f.size>5*1024*1024){alert('Il file supera 5 MB.');return}
 const r=new FileReader();r.onerror=()=>alert('Impossibile leggere il file.');r.onload=()=>{
  try{
   const obj=JSON.parse(r.result);let entries,newConfig,newClosures=null;
   if(Array.isArray(obj)){// Compatibilità con le copie delle versioni precedenti
    entries=obj;newConfig=null;
   }else if(obj&&obj.format==='agenda-ipia-backup'&&obj.schema===1){entries=obj.entries;newConfig=obj.personalization;if(obj.closures!==undefined){if(!Array.isArray(obj.closures)||obj.closures.length>300||normalizeClosures(obj.closures).length!==obj.closures.length)throw Error('Sospensioni non valide');newClosures=normalizeClosures(obj.closures)}if(!validPersonalization(newConfig))throw Error('Personalizzazioni non valide')}
   else throw Error('Formato sconosciuto');
   if(!validEntries(entries))throw Error('Lezioni o impegni non validi');
   const keepClosures=newClosures===null;const msg=newConfig?'Ripristinare questo backup completo? Lezioni, impegni e personalizzazioni attuali saranno SOSTITUITI.'+(keepClosures?' Le sospensioni attuali resteranno invariate.':' Anche le sospensioni attuali saranno SOSTITUITE.')+' Questa operazione non può essere annullata.':'Ripristinare questo vecchio backup? Lezioni e impegni attuali saranno SOSTITUITI. Personalizzazioni e sospensioni correnti resteranno invariate.';
   if(!confirm(msg))return;
   // Conserva gli stessi identificatori localStorage delle versioni precedenti.
   const oldEntries=localStorage.getItem(KEY),oldConfig=localStorage.getItem(CONFIG_KEY),oldClosures=localStorage.getItem(CLOSURES_KEY);
   try{localStorage.setItem(SAFETY_BACKUP_KEY,JSON.stringify(backupSnapshot()));localStorage.setItem(KEY,JSON.stringify(entries));if(newConfig)localStorage.setItem(CONFIG_KEY,JSON.stringify(normalizeConfig(newConfig)));if(!keepClosures)localStorage.setItem(CLOSURES_KEY,JSON.stringify(newClosures))}
   catch(writeError){if(oldEntries===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,oldEntries);if(oldConfig===null)localStorage.removeItem(CONFIG_KEY);else localStorage.setItem(CONFIG_KEY,oldConfig);if(oldClosures===null)localStorage.removeItem(CLOSURES_KEY);else localStorage.setItem(CLOSURES_KEY,oldClosures);throw writeError}
   data=entries;if(newConfig)config=normalizeConfig(newConfig);if(!keepClosures)closures=newClosures;
   populateChoices();renderSettings();renderClosures();render();navigate('today');alert('Backup ripristinato correttamente.');
  }catch(err){alert('Backup non valido o impossibile da ripristinare: '+err.message)}
 };r.readAsText(f);
}

function backupSnapshot(){
 return {format:'agenda-ipia-backup',schema:1,exportedAt:new Date().toISOString(),appVersion:APP_VERSION,entries:JSON.parse(JSON.stringify(data)),personalization:JSON.parse(JSON.stringify(config)),closures:JSON.parse(JSON.stringify(closures))};
}
function persistedBackupSnapshot(){const x=backupSnapshot();try{x.entries=JSON.parse(localStorage.getItem(KEY)||'[]');x.personalization=JSON.parse(localStorage.getItem(CONFIG_KEY)||'null')||x.personalization;x.closures=JSON.parse(localStorage.getItem(CLOSURES_KEY)||'[]')}catch(e){}return x}
function readAutoBackups(){try{const list=JSON.parse(localStorage.getItem(AUTO_BACKUP_KEY)||'[]');return Array.isArray(list)?list.filter(x=>x&&x.snapshot&&typeof x.day==='string').slice(0,7):[]}catch(e){return []}}
function beforeAgendaChange(){
 try{
  const day=localDate(),list=readAutoBackups();
  if(list.some(x=>x.day===day))return;
  list.unshift({day,snapshot:persistedBackupSnapshot()});
  localStorage.setItem(AUTO_BACKUP_KEY,JSON.stringify(list.slice(0,7)));
  renderBackupList();
 }catch(e){console.warn('Backup automatico non disponibile:',e);const el=$('backupStatus');if(el)el.textContent='Attenzione: impossibile creare la copia locale. Esporta un backup JSON.'}
}
function renderBackupList(){
 const el=$('backupList');if(!el)return;
 const list=readAutoBackups(),safety=localStorage.getItem(SAFETY_BACKUP_KEY);
 el.innerHTML=(safety?'<div class="closure-row"><span><strong>Copia prima dell’ultimo ripristino</strong><small>Ripristino di sicurezza</small></span><button type="button" onclick="restoreLocalBackup(-1)">Ripristina</button></div>':'')+
 list.map((x,i)=>'<div class="closure-row"><span><strong>'+safe(x.day)+'</strong><small>Copia automatica prima delle modifiche</small></span><button type="button" onclick="restoreLocalBackup('+i+')">Ripristina</button></div>').join('')+
 (!list.length&&!safety?'<p class="hint">Nessuna copia ancora disponibile. La prima verrà creata quando modifichi i dati.</p>':'');
 const status=$('backupStatus');if(status&&!status.textContent.startsWith('Attenzione'))status.textContent=list.length+' copie automatiche conservate (massimo 7).';
}
function restoreLocalBackup(index){
 try{
  const snapshot=index===-1?JSON.parse(localStorage.getItem(SAFETY_BACKUP_KEY)||'null'):readAutoBackups()[index]?.snapshot;
  if(!snapshot||snapshot.format!=='agenda-ipia-backup'||snapshot.schema!==1||!validEntries(snapshot.entries)||!validPersonalization(snapshot.personalization)||!Array.isArray(snapshot.closures)||normalizeClosures(snapshot.closures).length!==snapshot.closures.length)throw Error('Copia non valida');
  if(!confirm('Ripristinare questa copia? I dati attuali verranno sostituiti. Verrà prima creata una copia di sicurezza.'))return;
  const current=backupSnapshot(),old=[localStorage.getItem(KEY),localStorage.getItem(CONFIG_KEY),localStorage.getItem(CLOSURES_KEY)];
  // La copia di sicurezza va salvata prima di modificare qualsiasi dato.
  localStorage.setItem(SAFETY_BACKUP_KEY,JSON.stringify(current));
  try{
   localStorage.setItem(KEY,JSON.stringify(snapshot.entries));
   localStorage.setItem(CONFIG_KEY,JSON.stringify(normalizeConfig(snapshot.personalization)));
   localStorage.setItem(CLOSURES_KEY,JSON.stringify(normalizeClosures(snapshot.closures)));
  }catch(e){[KEY,CONFIG_KEY,CLOSURES_KEY].forEach((k,i)=>old[i]===null?localStorage.removeItem(k):localStorage.setItem(k,old[i]));throw e}
  data=snapshot.entries;config=normalizeConfig(snapshot.personalization);closures=normalizeClosures(snapshot.closures);
  populateChoices();renderSettings();renderClosures();render();renderBackupList();alert('Copia locale ripristinata.');
 }catch(e){alert('Impossibile ripristinare la copia: '+e.message)}
}

window.agendaCloudExport=()=>backupSnapshot();
window.agendaCloudImport=function(x){
 if(!x||x.format!=='agenda-ipia-backup'||x.schema!==1||!validEntries(x.entries)||!validPersonalization(x.personalization)||!Array.isArray(x.closures)||x.closures.length>300||normalizeClosures(x.closures).length!==x.closures.length)throw Error('Backup cloud non valido');
 const keys=[KEY,CONFIG_KEY,CLOSURES_KEY,SAFETY_BACKUP_KEY],old=keys.map(k=>localStorage.getItem(k));
 try{
  localStorage.setItem(SAFETY_BACKUP_KEY,JSON.stringify(backupSnapshot()));
  localStorage.setItem(KEY,JSON.stringify(x.entries));
  localStorage.setItem(CONFIG_KEY,JSON.stringify(normalizeConfig(x.personalization)));
  localStorage.setItem(CLOSURES_KEY,JSON.stringify(normalizeClosures(x.closures)));
 }catch(e){keys.forEach((k,i)=>{try{old[i]===null?localStorage.removeItem(k):localStorage.setItem(k,old[i])}catch(_){}});throw e}
 data=x.entries;config=normalizeConfig(x.personalization);closures=normalizeClosures(x.closures);
 populateChoices();renderSettings();renderClosures();render();renderBackupList();
};
const APP_VERSION='4.9.43';
let latestAppVersion=null;const versionLabel=$('appVersionLabel');if(versionLabel)versionLabel.textContent=APP_VERSION+' TEST';
function versionParts(v){return String(v).split('.').map(x=>Number(x)||0)}
function newerVersion(a,b){const aa=versionParts(a),bb=versionParts(b);for(let i=0;i<Math.max(aa.length,bb.length);i++){if((aa[i]||0)!==(bb[i]||0))return (aa[i]||0)>(bb[i]||0)}return false}
async function checkAppVersion(){
 if(!navigator.onLine)return;
 try{
  const url='./version.json?check='+Date.now();
  const response=await fetch(url,{cache:'no-store'});if(!response.ok)return;
  const info=await response.json();
  if(!info||typeof info.version!=='string')return;
  if(newerVersion(info.version,APP_VERSION)){
   latestAppVersion=info.version;
   $('updateDescription').textContent='È disponibile Agenda IPIA '+info.version+'. I tuoi dati locali rimarranno sul dispositivo.';
   $('updateNotice').hidden=false;
  }else{latestAppVersion=null;$('updateNotice').hidden=true}
 }catch(e){}
}
async function applyAppUpdate(){
 if(!latestAppVersion)return;
 const button=$('applyUpdate');button.disabled=true;button.textContent='Aggiornamento…';
 try{
  if('serviceWorker' in navigator){const reg=await navigator.serviceWorker.getRegistration();if(reg){await reg.update();if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'})}}
  // URL differente per forzare un nuovo download della pagina dopo la pubblicazione.
  location.replace('./?updated='+encodeURIComponent(latestAppVersion)+'&t='+Date.now());
 }catch(e){button.disabled=false;button.textContent='Aggiorna';alert('Riprova quando sei online.')}
}
populateChoices();setupTimes();render();renderClosures();if(!data.length&&!config.subjects.length&&!config.classes.length)navigate('settings');if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
window.addEventListener('load',()=>{checkAppVersion();setInterval(checkAppVersion,15*60*1000)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkAppVersion()});
window.addEventListener('online',checkAppVersion);
setInterval(()=>{if(!document.hidden&&document.querySelector('#today.view.active'))render()},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
// Esponi esplicitamente l'azione al pulsante HTML anche in Safari.
window.openForm=openForm;
