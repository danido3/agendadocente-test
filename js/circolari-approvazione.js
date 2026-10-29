/* Agenda IPIA TEST — proposte pubbliche con approvazione esplicita.
   Non scarica documenti riservati e non modifica l'agenda senza un click. */
(() => {
  'use strict';
  const source = './data/proposte-circolari.json';
  const container = document.getElementById('circularProposals');
  if (!container) return;
  let proposals = [];
  const ignoredKey = 'agenda-ipia-circolari-ignorate-test-v1';
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function ignored() {
    try { const v=JSON.parse(localStorage.getItem(ignoredKey)||'[]');return Array.isArray(v)?v:[]; }
    catch { return []; }
  }
  const validated = p => p && typeof p.id==='string' && /^circ92-[a-z0-9-]+$/.test(p.id)
    && typeof p.titolo==='string' && p.titolo.length<100
    && typeof p.classe==='string' && p.classe.length<40
    && validDate(p.data) && validTime(p.ora_inizio) && validTime(p.ora_fine)
    && p.ora_inizio < p.ora_fine
    && p.fonte && p.fonte.circolare===92
    && typeof p.fonte.url==='string' && p.fonte.url.startsWith('https://www.ipsiaiglesias.edu.it/circolare/');
  function draw() {
    const omitted = new Set(ignored());
    const pending = proposals.filter(p => !omitted.has(p.id) && !data.some(x => x.id === 'circolare-'+p.id));
    container.hidden = pending.length === 0;
    if (!pending.length) { container.innerHTML='';return; }
    container.innerHTML = '<h2 class="today-section-heading">Circolari da approvare <span class="today-section-count">· '+pending.length+'</span></h2>'+
      '<p class="hint">TEST · proposte estratte dalla circolare 92. Nessuna aggiunta senza conferma.</p>'+
      pending.map(p => '<div class="card school-event circular-proposal"><div class="content"><strong>'+escapeHtml(p.titolo)+'</strong>'+
      '<div class="meta">'+escapeHtml(p.data.split('-').reverse().join('/'))+' · '+escapeHtml(p.ora_inizio)+'–'+escapeHtml(p.ora_fine)+'</div>'+
      '<div class="note">Circolare n. 92 · <a target="_blank" rel="noopener noreferrer" href="'+escapeHtml(p.fonte.url)+'">Apri documento</a></div>'+
      '<div class="circular-actions"><button type="button" class="primary" data-circular-action="approve" data-proposal="'+escapeHtml(p.id)+'">Approva</button>'+
      '<button type="button" data-circular-action="ignore" data-proposal="'+escapeHtml(p.id)+'">Ignora</button></div></div></div>').join('');
  }
  container.addEventListener('click', e => {
    const b=e.target.closest('button[data-circular-action]');
    if (!b) return;
    const p=proposals.find(x=>x.id===b.dataset.proposal);
    if (!p || !validated(p)) return;
    if (b.dataset.circularAction==='ignore') {
      const set=new Set(ignored());set.add(p.id);
      localStorage.setItem(ignoredKey, JSON.stringify([...set]));draw();return;
    }
    const id='circolare-'+p.id;
    if (data.some(x=>x.id===id)) {draw();return;}
    const conflict=data.some(x=>x.type==='event' && x.date===p.data &&
      x.classroom===p.classe && x.start===p.ora_inizio && x.end===p.ora_fine);
    if (conflict) {alert('Un impegno identico per classe, data e orario è già presente. Nessuna duplicazione.');return;}
    if (!confirm('Confermi l’inserimento in Agenda IPIA TEST?\\n'+p.titolo+'\\n'+p.data+' · '+p.ora_inizio+'–'+p.ora_fine)) return;
    data.push({id,type:'event',day:'',date:p.data,start:p.ora_inizio,end:p.ora_fine,
      subject:'Consiglio di classe',classroom:p.classe,room:'',
      note:'Circolare n. '+p.fonte.circolare,reminder:'5'});
    save();draw();
  });
  window.addEventListener('agenda-local-changed',draw);
  async function load() {
    try {
      const r=await fetch(source+'?t='+Date.now(),{cache:'no-store'});
      if (!r.ok) throw Error('HTTP '+r.status);
      const json=await r.json();
      if(json.schema!=='agenda-ipia-proposte-v1' || !Array.isArray(json.proposte)) throw Error('Formato inatteso');
      proposals=json.proposte.filter(validated);
      draw();
    } catch (err) {
      container.hidden=false;
      container.innerHTML='<p class="hint">Proposte delle circolari non disponibili: '+escapeHtml(err.message)+'. Riprova aggiornando l’app.</p>';
    }
  }
  load();
})();