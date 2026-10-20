
const CONFIG_KEY='agenda-ipia-config-v1';
const defaultConfig={subjects:[],classes:[],rooms:[],notes:[],eventStyle:{background:'#f0e9fb',todayBorder:'#e8a43a'}};
function normalizeConfig(v){const result=JSON.parse(JSON.stringify(defaultConfig));if(!v||typeof v!=='object')return result;for(const k of ['subjects','classes','rooms','notes'])if(Array.isArray(v[k])){const seen=new Set();result[k]=v[k].filter(x=>{const n=typeof x==='string'?x:x?.name;const valid=typeof n==='string'&&n.trim().length>0&&!seen.has(n.trim().toLowerCase());if(valid)seen.add(n.trim().toLowerCase());return valid}).slice(0,80).map(x=>k==='subjects'||k==='classes'?{name:String(x.name).slice(0,60),color:/^#[0-9a-f]{6}$/i.test(x.color)?x.color:(k==='subjects'?'#eaf2fc':'#dcebff')}:String(x).slice(0,100))}if(v.eventStyle&&typeof v.eventStyle==='object'){for(const k of ['background','todayBorder'])if(typeof v.eventStyle[k]==='string'&&/^#[0-9a-f]{6}$/i.test(v.eventStyle[k]))result.eventStyle[k]=v.eventStyle[k]}return result}
let config=normalizeConfig(null);try{config=normalizeConfig(JSON.parse(localStorage.getItem(CONFIG_KEY)||'null'))}catch(e){}
function saveConfig(){localStorage.setItem(CONFIG_KEY,JSON.stringify(config));populateChoices();renderSettings();render()}
function findColor(group,name,fallback){return config[group].find(x=>x.name===name)?.color||fallback}
function inkFor(bg){if(!/^#[0-9a-f]{6}$/i.test(bg))return '#1e293b';const rgb=[1,3,5].map(i=>parseInt(bg.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.19?'#253348':'#ffffff'}
function styleColor(bg){return 'background:'+bg+';color:'+inkFor(bg)+';border-color:'+bg}
function populateChoices(){const refill=(id,items)=>{const el=$(id),old=el.value;el.innerHTML='';for(const item of items)el.add(new Option(item.name,item.name));if(old&&!items.some(x=>x.name===old))el.add(new Option(old+' (già usato)',old));if(old)el.value=old};refill('lessonSubject',config.subjects);refill('lessonClass',config.classes);$('roomOptions').innerHTML='';config.rooms.forEach(x=>$('roomOptions').appendChild(new Option(x,x)));const n=$('presetNote'),prev=n.value;n.innerHTML='<option value="">Nota libera / nessuna nota</option>';config.notes.forEach(x=>n.add(new Option(x,x)));n.value=prev&&config.notes.includes(prev)?prev:''}
function choosePresetNote(){if($('presetNote').value)$('note').value=$('presetNote').value}
function renderSettings(){const labels={subjects:'Materie',classes:'Classi',rooms:'Aule e laboratori',notes:'Note predefinite'};let html='';for(const group of ['subjects','classes','rooms','notes']){html+='<div class="setting-group"><h3>'+labels[group]+'</h3>';if(!config[group].length)html+='<p class="setting-empty">Nessuna voce inserita. Scrivi qui sotto per aggiungerne una.</p>';config[group].forEach((item,i)=>{const obj=group==='subjects'||group==='classes';const value=obj?item.name:item;html+='<div class="setting-line"><input type="text" aria-label="'+labels[group]+' '+(i+1)+'" maxlength="100" value="'+safe(value)+'" data-setting="'+group+'" data-index="'+i+'" data-field="name">'+(obj?'<input type="color" aria-label="Colore '+safe(value)+'" value="'+item.color+'" data-setting="'+group+'" data-index="'+i+'" data-field="color">':'')+'<button type="button" class="danger small" data-delete="'+group+'" data-index="'+i+'" aria-label="Elimina '+safe(value)+'">×</button></div>'});html+='<div class="setting-add"><input type="text" maxlength="100" id="new-'+group+'" placeholder="Aggiungi '+labels[group].toLowerCase()+'"><button type="button" data-add="'+group+'">＋</button></div></div>'}$('personalization').innerHTML=html;$('eventBackground').value=config.eventStyle.background;$('eventTodayBorder').value=config.eventStyle.todayBorder;const prompt=$('setupMessage');if(prompt)prompt.hidden=!!(config.subjects.length&&config.classes.length)}
function changeEventColor(field,value){if(!['background','todayBorder'].includes(field)||!/^#[0-9a-f]{6}$/i.test(value))return;config.eventStyle[field]=value;saveConfig()}
function changeSetting(group,index,field,value){const arr=config[group];if(!arr||!arr[index])return;if(field==='color'){if(/^#[0-9a-f]{6}$/i.test(value))arr[index].color=value}else{value=value.trim();if(!value)return;const duplicate=arr.some((x,i)=>i!==index&&(typeof x==='string'?x:x.name).toLowerCase()===value.toLowerCase());if(duplicate){alert('Questa voce esiste già.');renderSettings();return}if(typeof arr[index]==='string')arr[index]=value;else {
 const previousName=arr[index].name;
 if(previousName!==value&&(group==='subjects'||group==='classes')){
  // Aggiorna anche i riferimenti di tutte le lezioni già salvate.
  // Mantieni intatti gli impegni scolastici, anche con nomi coincidenti.
  const fieldName=group==='subjects'?'subject':'classroom';
  const updated=data.map(entry=>entry.type==='lesson'&&entry[fieldName]===previousName?{...entry,[fieldName]:value}:entry);
  try{localStorage.setItem(KEY,JSON.stringify(updated))}catch(e){alert('Impossibile salvare le lezioni aggiornate. Riprova dopo aver liberato spazio.');renderSettings();return}
  data=updated;
 }
 arr[index].name=value;
}}saveConfig()}
function addSetting(group){const input=$('new-'+group),value=input.value.trim();if(!value)return;if(config[group].some(x=>(typeof x==='string'?x:x.name).toLowerCase()===value.toLowerCase())){alert('Questa voce esiste già.');return}if(['subjects','classes'].includes(group))config[group].push({name:value,color:group==='subjects'?'#eaf2fc':'#dcebff'});else config[group].push(value);saveConfig()}
document.getElementById('personalization').addEventListener('change',e=>{const t=e.target;if(t.dataset.setting)changeSetting(t.dataset.setting,Number(t.dataset.index),t.dataset.field,t.value)});
document.getElementById('personalization').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.add)addSetting(b.dataset.add);if(b.dataset.delete&&confirm('Eliminare questa voce dall’elenco? Le lezioni già inserite rimarranno salvate.')){config[b.dataset.delete].splice(Number(b.dataset.index),1);saveConfig()}});
const KEY='agenda-docente-v2';function setupTimes(){refreshTimes()};function refreshTimes(){const lesson=$('type').value==='lesson';for(const id of ['start','end']){const el=$(id),previous=el.value;el.innerHTML='';if(lesson){for(let h=8;h<=13;h++){const begin=(h===8?'08:20':String(h).padStart(2,'0')+':20');const finish=String(h+1).padStart(2,'0')+':20';const t=id==='start'?begin:finish;el.add(new Option(t,t))}el.disabled=false}else{el.disabled=false;for(let h=0;h<24;h++)for(let m=0;m<60;m+=10){const t=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');el.add(new Option(t,t))}}if(previous&&Array.from(el.options).some(o=>o.value===previous))el.value=previous;else if(id==='end'&&lesson)el.value='09:20';if(id==='end')syncEndPicker()}};function syncEndPicker(){const v=$('end').value||'09:20';$('endPicker').textContent=v+' ▾';$('endChoices').innerHTML=Array.from($('end').options).map(o=>'<button type="button" data-time="'+o.value+'" style="display:block;width:100%;text-align:left;background:white;color:#22314a;border:0;border-bottom:1px solid #eef1f6;padding:13px 16px;font-size:18px">'+o.textContent+'</button>').join('');$('endChoices').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ $('end').value=b.dataset.time;syncEndPicker();$('endChoices').hidden=true;$('endPicker').setAttribute('aria-expanded','false')}))}function updateEndFromStart(){if($('type').value!=='lesson')return;const starts=['08:20','09:20','10:20','11:20','12:20','13:20'];const ends=['09:20','10:20','11:20','12:20','13:20','14:20'];const i=starts.indexOf($('start').value);if(i>=0){$('end').value=ends[i];syncEndPicker();$('endChoices').hidden=true;$('endPicker').setAttribute('aria-expanded','false')}}function toggleEndPicker(){syncEndPicker();const panel=$('endChoices');panel.hidden=!panel.hidden;$('endPicker').setAttribute('aria-expanded',String(!panel.hidden))};function setTime(id,value){const el=$(id);if(value&&!Array.from(el.options).some(o=>o.value===value)){el.add(new Option(value+' (precedente)',value))}el.value=value|| (id==='start'?'08:20':'09:20');if(id==='end')syncEndPicker()};const days=['','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];const $=id=>document.getElementById(id);$('start').addEventListener('change',updateEndFromStart);let data=[];let editing=null;try{const stored=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(stored))data=stored}catch(e){}// Per installazioni già in uso senza configurazione salvata, recupera le voci dalle lezioni esistenti.
// Una nuova installazione parte invece senza alcuna voce predefinita.
if(!localStorage.getItem(CONFIG_KEY)&&data.some(x=>x.type==='lesson')){
 const previousSubjectColors={'LTE':'#fff0b8','TTIMD':'#e2f4e7'};
 const previousClassColors={'2ªA MAT':'#dcebff','4ªA MAT':'#ffe0d5','4ªB MAT':'#f0deff'};
 const subjects=[...new Set(data.filter(x=>x.type==='lesson').map(x=>x.subject).filter(Boolean))];
 const classes=[...new Set(data.filter(x=>x.type==='lesson').map(x=>x.classroom).filter(Boolean))];
 config.subjects=subjects.map(name=>({name,color:previousSubjectColors[name]||'#eaf2fc'}));
 config.classes=classes.map(name=>({name,color:previousClassColors[name]||'#dcebff'}));
 localStorage.setItem(CONFIG_KEY,JSON.stringify(config));
}
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function save(){localStorage.setItem(KEY,JSON.stringify(data));render()};function navigate(page){document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===page));document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===page));$('heading').textContent=({today:'Oggi',week:'Settimana',commitments:'Impegni',settings:'Impostazioni',editor:'Modifica agenda'})[page];window.scrollTo(0,0);if(page==='settings')renderSettings();if(page!=='editor')render()};function card(x,highlightToday=false){const todayEvent=x.type==='event'&&highlightToday;const style=x.type==='lesson'?styleColor(findColor('subjects',x.subject,'#eaf2fc')):'background:'+config.eventStyle.background+';border-color:'+(todayEvent?config.eventStyle.todayBorder:config.eventStyle.background)+';--today-border:'+config.eventStyle.todayBorder;return `<div class="card ${x.type==='lesson'?'personal-lesson':'school-event'}${todayEvent?' event-today':''}" style="${style}"><div class="time">${safe(x.start)}<br>${safe(x.end)}</div><div class="content">${todayEvent?'<span class="today-label">OGGI</span>':''}<strong>${safe(x.subject)}</strong>${x.classroom||x.room?`<div class="meta">${x.classroom?(x.type==='lesson'?'<span class="class-badge" style="'+styleColor(findColor('classes',x.classroom,'#eaf2fc'))+'">'+safe(x.classroom)+'</span>':'Classe '+safe(x.classroom)):''}${x.classroom&&x.room?' · ':''}${x.room?safe(x.room):''}</div>`:''}${x.note?`<div class="note">✎ ${safe(x.note)}</div>`:''}</div><div class="actions"><button class="small" onclick="editEntry('${x.id}')" aria-label="Modifica">✎</button><button class="small danger" onclick="removeEntry('${x.id}')" aria-label="Elimina">×</button></div></div>`};function list(a){return a.length?a.sort((x,y)=>x.start.localeCompare(y.start)).map(card).join(''):'<div class="empty">Nessuna voce inserita.</div>'};function lessonHours(entry){
 const toMinutes=t=>{const m=/^(\d{2}):(\d{2})$/.exec(t||'');return m?Number(m[1])*60+Number(m[2]):NaN};
 const minutes=toMinutes(entry.end)-toMinutes(entry.start);
 return Number.isFinite(minutes)&&minutes>0?minutes/60:0;
}
function formatHours(hours){return Number(hours.toFixed(2)).toLocaleString('it-IT',{maximumFractionDigits:2})}
function render(){const now=new Date(),dow=now.getDay(),date=localDate();$('todayDate').textContent=now.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});const lessons=data.filter(x=>x.type==='lesson'&&Number(x.day)===dow);const currentTime=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');const extras=data.filter(x=>x.type==='event'&&x.date&&(x.date>date||(x.date===date&&(x.end||x.start||'00:00')>=currentTime))).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));$('lc').textContent=formatHours(lessons.reduce((total,x)=>total+lessonHours(x),0));$('ec').textContent=extras.length;$('todayLessons').innerHTML=list(lessons);$('todayExtras').innerHTML=extras.length?extras.map(x=>`<div class="muted" style="margin-top:18px">${safe(new Date(x.date+'T12:00:00').toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}</div>${card(x,x.date===date)}`).join(''):'<div class="empty">Nessun impegno in programma.</div>';$('weekList').innerHTML=renderWeekTable();const all=data.filter(x=>x.type==='event');
const eventIsUpcoming=x=>x.date>date||(x.date===date&&(x.end||x.start||'00:00')>=currentTime);
const upcoming=all.filter(eventIsUpcoming).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
const history=all.filter(x=>!eventIsUpcoming(x)).sort((a,b)=>b.date.localeCompare(a.date)||b.start.localeCompare(a.start));
const eventMarkup=x=>`<div class="muted" style="margin-top:18px">${safe(new Date(x.date+'T12:00:00').toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}</div>${card(x)}`;
$('commitmentList').innerHTML=all.length?'<h3>In programma ('+upcoming.length+')</h3>'+(upcoming.length?upcoming.map(eventMarkup).join(''):'<div class="empty">Nessun impegno futuro.</div>')+(history.length?'<h3 style="margin-top:28px">Impegni passati ('+history.length+')</h3>'+history.map(eventMarkup).join(''):''):'<div class="empty">Nessun impegno inserito.</div>'};function renderWeekTable(){
 const lessons=data.filter(x=>x.type==='lesson');
 if(!lessons.length)return '<div class="empty">Nessuna lezione settimanale inserita.</div>';
 const weekdays=lessons.some(x=>Number(x.day)===6)?[1,2,3,4,5,6]:[1,2,3,4,5];
 const starts=['08:20','09:20','10:20','11:20','12:20','13:20'];
 const endings=['09:20','10:20','11:20','12:20','13:20','14:20'];
 const extra=lessons.map(x=>x.start).filter(t=>t&&!starts.includes(t));
 const slots=[...new Set([...starts,...extra])].sort();
 const currentWeekday=new Date().getDay();
 const head='<thead><tr><th scope="col">Ora</th>'+weekdays.map(d=>'<th scope="col"'+(d===currentWeekday?' class="week-current-day" aria-current="date"':'')+'>'+safe(days[d])+'</th>').join('')+'</tr></thead>';
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
     if(!matches.length)return '<td><span class="week-empty">—</span></td>';
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
     return '<td'+(span>1?' rowspan="'+span+'" class="week-spanning" style="--lesson-span-height:'+(76*span-6)+'px"':'')+'><div class="week-cell">'+matches.map(lessonButton).join('')+'</div></td>';
   }).join('');
   return '<tr><td>'+label+'</td>'+cells+'</tr>';
 }).join('');
 return '<div class="week-scroll" tabindex="0" aria-label="Tabella orario settimanale, scorri orizzontalmente"><table class="week-table">'+head+'<tbody>'+rows+'</tbody></table></div>';
}
function xEnd(x){return x.end||''}
$('weekList').addEventListener('click',e=>{const b=e.target.closest('[data-entry-id]');if(b)editEntry(b.dataset.entryId)});
function toggleFields(){const lesson=$('type').value==='lesson';$('weeklyFields').style.display=lesson?'block':'none';$('dateFields').style.display=lesson?'none':'block';$('date').required=!lesson;$('lessonSubject').style.display=lesson?'block':'none';$('subject').style.display=lesson?'none':'block';$('subject').required=!lesson;$('lessonClass').style.display=lesson?'block':'none';$('classroom').style.display=lesson?'none':'block';refreshTimes()};function openForm(id){editing=null;$('entryForm').reset();populateChoices();$('presetNote').value='';$('endChoices').hidden=true;setTime('start','08:20');setTime('end','09:20');$('date').value=localDate();$('day').value=String(new Date().getDay()||1);$('formHeading').textContent='Nuova voce';toggleFields();navigate('editor')};function setSelectChoice(id,value){const el=$(id);if(value&&!Array.from(el.options).some(o=>o.value===value))el.add(new Option(value+' (già usato)',value));if(value)el.value=value}function editEntry(id){const x=data.find(x=>x.id===id);if(!x)return;editing=id;for(const k of ['type','day','date','classroom','room','note'])$(k).value=x[k]||'';populateChoices();setSelectChoice('lessonClass',x.classroom);$('subject').value=x.subject||'';setSelectChoice('lessonSubject',x.subject);$('presetNote').value=config.notes.includes(x.note)?x.note:'';$('formHeading').textContent='Modifica voce';toggleFields();setTime('start',x.start);setTime('end',x.end);navigate('editor')};$('entryForm').addEventListener('submit',e=>{e.preventDefault();const x={id:editing||String(Date.now())+Math.random().toString(36).slice(2),type:$('type').value,day:$('day').value,date:$('date').value,start:$('start').value,end:$('end').value,subject:$('type').value==='lesson'?$('lessonSubject').value:$('subject').value.trim(),classroom:$('type').value==='lesson'?$('lessonClass').value:$('classroom').value.trim(),room:$('room').value.trim(),note:$('note').value.trim(),reminder:''};if(x.type==='lesson'){if(!config.subjects.length||!config.classes.length){alert('Per inserire una lezione configura prima materie e classi nelle Impostazioni.');navigate('settings');$('setupMessage').hidden=false;return}if(!x.classroom){alert('Seleziona una classe.');return}const valid=['08:20','09:20','10:20','11:20','12:20','13:20'];if(!valid.includes(x.start)){alert('Seleziona un orario di inizio valido.');return}}if(x.end<=x.start){alert('L’orario di fine deve essere successivo a quello di inizio.');return}if(!x.subject){alert('Inserisci materia o impegno.');return}if(editing)data=data.map(y=>y.id===editing?x:y);else data.push(x);save();navigate(x.type==='lesson'?'week':'commitments')});function removeEntry(id){if(confirm('Eliminare questa voce?')){data=data.filter(x=>x.id!==id);save()}}function clearData(){if(confirm('Vuoi cancellare definitivamente tutti i dati?')){data=[];save();navigate('today')}}function exportConfig(){const b=new Blob([JSON.stringify(config,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='agenda-ipia-personalizzazioni.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}function importConfig(e){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const obj=JSON.parse(r.result);if(!obj||typeof obj!=='object'||!Array.isArray(obj.subjects)||!Array.isArray(obj.classes))throw Error();if(confirm('Sostituire gli elenchi personalizzati? Le lezioni resteranno salvate.')){config=normalizeConfig(obj);saveConfig()}}catch(err){alert('File personalizzazioni non valido.')}};r.readAsText(f);e.target.value=''}function exportData(){
  try{
    const backup={format:'agenda-ipia-backup',schema:1,exportedAt:new Date().toISOString(),appVersion:APP_VERSION,entries:data,personalization:config};
    const b=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');
    a.href=url;a.download='agenda-ipia-backup-'+localDate()+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(err){alert('Impossibile esportare il backup: '+err.message)}
}
function validTime(value){if(typeof value!=='string'||!/^\d{2}:\d{2}$/.test(value))return false;const [h,m]=value.split(':').map(Number);return h>=0&&h<=23&&m>=0&&m<=59}
function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number);const date=new Date(y,m-1,d);return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d}
function validEntries(arr){if(!Array.isArray(arr)||arr.length>20000)return false;const ids=new Set();return arr.every(x=>{if(!x||typeof x!=='object'||typeof x.id!=='string'||!x.id||ids.has(x.id)||!['lesson','event'].includes(x.type)||typeof x.subject!=='string'||!x.subject.trim()||!validTime(x.start)||!validTime(x.end)||x.end<=x.start)return false;ids.add(x.id);return x.type==='lesson'?['1','2','3','4','5','6'].includes(String(x.day)):(validDate(x.date))})}
function validPersonalization(v){return v&&typeof v==='object'&&!Array.isArray(v)&&['subjects','classes','rooms','notes'].every(k=>Array.isArray(v[k])&&v[k].length<=80&&v[k].every(x=>(k==='subjects'||k==='classes')?(x&&typeof x.name==='string'&&typeof x.color==='string'):typeof x==='string'))}
function importData(e){
 const f=e.target.files?.[0];e.target.value='';if(!f)return;
 if(f.size>5*1024*1024){alert('Il file supera 5 MB.');return}
 const r=new FileReader();r.onerror=()=>alert('Impossibile leggere il file.');r.onload=()=>{
  try{
   const obj=JSON.parse(r.result);let entries,newConfig;
   if(Array.isArray(obj)){// Compatibilità con le copie delle versioni precedenti
    entries=obj;newConfig=null;
   }else if(obj&&obj.format==='agenda-ipia-backup'&&obj.schema===1){entries=obj.entries;newConfig=obj.personalization;if(!validPersonalization(newConfig))throw Error('Personalizzazioni non valide')}
   else throw Error('Formato sconosciuto');
   if(!validEntries(entries))throw Error('Lezioni o impegni non validi');
   const msg=newConfig?'Ripristinare questo backup completo? Lezioni, impegni e personalizzazioni attuali saranno SOSTITUITI. Questa operazione non può essere annullata.':'Ripristinare questo vecchio backup? Lezioni e impegni attuali saranno SOSTITUITI. Le personalizzazioni correnti resteranno invariate.';
   if(!confirm(msg))return;
   // Conserva gli stessi identificatori localStorage delle versioni precedenti.
   const oldEntries=localStorage.getItem(KEY),oldConfig=localStorage.getItem(CONFIG_KEY);
   try{localStorage.setItem(KEY,JSON.stringify(entries));if(newConfig)localStorage.setItem(CONFIG_KEY,JSON.stringify(normalizeConfig(newConfig)))}
   catch(writeError){if(oldEntries===null)localStorage.removeItem(KEY);else localStorage.setItem(KEY,oldEntries);if(oldConfig===null)localStorage.removeItem(CONFIG_KEY);else localStorage.setItem(CONFIG_KEY,oldConfig);throw writeError}
   data=entries;if(newConfig)config=normalizeConfig(newConfig);
   populateChoices();renderSettings();render();navigate('today');alert('Backup ripristinato correttamente.');
  }catch(err){alert('Backup non valido o impossibile da ripristinare: '+err.message)}
 };r.readAsText(f);
}
const APP_VERSION='4.8';
let latestAppVersion=null;
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
  }
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
populateChoices();setupTimes();render();if(!data.length&&!config.subjects.length&&!config.classes.length)navigate('settings');if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
window.addEventListener('load',()=>{checkAppVersion();setInterval(checkAppVersion,15*60*1000)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkAppVersion()});
window.addEventListener('online',checkAppVersion);