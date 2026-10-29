#!/usr/bin/env python3
"""Diagnostica pubblica, senza scritture su agenda o file delle proposte.
L'ambito appuntamenti replica le tre classi e i tipi generali del parser esistente.
Non conserva titoli, URL delle singole circolari, PDF, testi o nominativi.
"""
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit, parse_qs, urlencode

import requests
from bs4 import BeautifulSoup
import fitz
from proposte_circolare_92 import extract_nearby_schedule
from test_pdf_circolare_92 import matches_class, clean
from estrai_riunioni_generali import single_general_event, type_for

ROOT = 'https://www.ipsiaiglesias.edu.it'
ARCHIVE = ROOT + '/circolare/?anno-scolastico=2026'
SENSITIVE = re.compile(r'\b(glo|glh|pei|pdp|bes|dsa|disabil\w*|riservat\w*|sensibil\w*)\b', re.I)
CALL = re.compile(r'convocazion|consigl(?:io|i) di classe|collegio|dipartiment|scuola.famiglia|ricevimento general|incontro con le famiglie|assemblea|scrutin|riunione', re.I)
REASON = {
 'non_convocazione':'Titolo fuori dai criteri di riconoscimento delle convocazioni.',
 'tipo_non_supportato':'Convocazione candidata di un tipo non gestito dal parser attuale.',
 'dati_sensibili':'Possibili dati sensibili: allegati non letti o contenuto scartato.',
 'rettifica':'Rettifica, annullamento o aggiornamento: richiede confronto manuale.',
 'lettura_fallita':'Pagina o documento non leggibile; risultato parziale.',
 'nessun_pdf':'Nessun PDF pubblico diretto nel contenuto principale.',
 'pdf_senza_testo':'PDF senza testo estraibile: possibile scansione.',
 'estrazione_incompleta':'Data/intervallo non univoci o nessuna riga delle tre classi configurate.',
 'fuori_anno':'Appuntamento fuori dal periodo 01/09/2026–31/08/2027.',
 'completo':'Data e intervallo completo riconosciuti; da verificare sul documento.',
}

def allowed(url):
    p = urlsplit(url)
    return p.scheme == 'https' and p.netloc == urlsplit(ROOT).netloc and not p.username


def fetch(url):
    """GET anonimo, redirect verificati prima di seguirli, limiti espliciti."""
    for _ in range(6):
        if not allowed(url):
            raise ValueError('origine_non_ammessa')
        with requests.get(url, headers={'User-Agent':'AgendaIPIA-Diagnostica/1.0'},
                          timeout=(10, 40), allow_redirects=False, stream=True) as r:
            if r.is_redirect:
                url = urljoin(url, r.headers['Location'])
                continue
            r.raise_for_status()
            chunks, size = [], 0
            for chunk in r.iter_content(65536):
                size += len(chunk)
                if size > 12 * 1024 * 1024:
                    raise ValueError('limite_documento')
                chunks.append(chunk)
            return b''.join(chunks)
    raise ValueError('troppi_redirect')


def archive_page(url):
    p = urlsplit(url)
    if not allowed(url) or not re.fullmatch(r'/circolare/(?:page/\d+/?)?', p.path):
        return None
    q = parse_qs(p.query)
    if q.get('anno-scolastico', ['2026']) != ['2026']:
        return None
    # La paginazione WP può omettere il filtro: lo conserviamo esplicitamente.
    q['anno-scolastico'] = ['2026']
    q = {k:v for k,v in q.items() if k in ('anno-scolastico','paged','page')}
    return urlunsplit((p.scheme,p.netloc,p.path or '/circolare/',urlencode(q,doseq=True),''))


def crawl(get=fetch):
    queue, visited, found, pages, errors, signatures = [ARCHIVE], set(), {}, [], [], set()
    while queue:
        if len(visited) >= 200:
            errors.append('limite_pagine'); break
        url = queue.pop(0)
        if url in visited: continue
        visited.add(url)
        try:
            soup = BeautifulSoup(get(url), 'html.parser')
            selected = soup.select('input[name="anno-scolastico"][checked]')
            if not selected or any(x.get('value') != '2026' for x in selected):
                raise ValueError('filtro_anno_non_verificato')
            cards = soup.select('main a.presentation-card-link:has(article)')
            if not cards: raise ValueError('schede_archivio_assenti')
            urls = []
            for a in cards:
                href = urljoin(url,a.get('href',''))
                p = urlsplit(href)
                h = a.select_one('h2')
                if not allowed(href) or not re.fullmatch('/circolare/[^/]+/',p.path) or not h:
                    raise ValueError('scheda_non_riconosciuta')
                href = urlunsplit((p.scheme,p.netloc,p.path,'',''))
                title = clean(h.get_text(' ',strip=True))
                m = re.search(r'circolare\s*n\.?\s*(\d+)',title,re.I)
                found[href] = (int(m.group(1)) if m else None,title)
                urls.append(href)
            signature = tuple(sorted(urls))
            if signature in signatures: errors.append('pagina_ripetuta')
            signatures.add(signature)
            pages.append({'url':url,'schede':len(urls)})
            for a in soup.select('main .pagination-wrapper a[href], main a.next[href], main a.page-numbers[href]'):
                nxt = archive_page(urljoin(url,a['href']))
                if nxt is None: errors.append('paginazione_non_riconosciuta')
                elif nxt not in visited and nxt not in queue: queue.append(nxt)
        except Exception:
            errors.append('archivio_non_verificato')
    return found, pages, errors


def category(title):
    if re.search(r'consigl(?:io|i) di classe',title,re.I): return 'consigli_di_classe'
    if type_for(title): return 'riunione_generale'
    return 'altra_convocazione' if CALL.search(title) else None


def analyze(number,title,url,get=fetch):
    cat = category(title)
    item = {'numero':number,'id':hashlib.sha256(url.encode()).hexdigest()[:16],
            'categoria':cat,'convocazione_riconosciuta':bool(cat),'appuntamenti':[],
            'motivi':[], 'documenti':0,'lettura_completa':True}
    reasons = item['motivi']
    if not cat: reasons.append('non_convocazione')
    elif SENSITIVE.search(title): reasons.append('dati_sensibili')
    elif re.search(r'rettifica|annull|aggiornamento.*ordine del giorno',title,re.I): reasons.append('rettifica')
    elif cat == 'altra_convocazione': reasons.append('tipo_non_supportato')
    else:
        try:
            soup = BeautifulSoup(get(url),'html.parser')
            main = soup.select_one('main article.article-wrapper')
            if main is None: raise ValueError('contenuto_assente')
            if SENSITIVE.search(main.get_text(' ',strip=True)):
                reasons.append('dati_sensibili')
            else:
                pdfs = sorted({urljoin(url,a['href']) for a in main.select('a[href]')
                               if allowed(urljoin(url,a['href'])) and urlsplit(urljoin(url,a['href'])).path.lower().endswith('.pdf')})
                if not pdfs: reasons.append('nessun_pdf')
                events = set()
                for pdf in pdfs:
                    item['documenti'] += 1
                    if SENSITIVE.search(pdf.replace('-', ' ').replace('_', ' ')):
                        reasons.append('dati_sensibili'); continue
                    try:
                        raw = get(pdf)
                        if not raw.startswith(b'%PDF-'): raise ValueError('pdf_invalido')
                        with fitz.open(stream=raw,filetype='pdf') as doc:
                            if len(doc)>80: raise ValueError('limite_pagine_pdf')
                            pages = [(i+1,p.get_text(sort=True)) for i,p in enumerate(doc)]
                        if not any(text.strip() for _,text in pages):
                            reasons.append('pdf_senza_testo'); item['lettura_completa']=False; continue
                        if SENSITIVE.search(' '.join(t for _,t in pages)):
                            reasons.append('dati_sensibili'); continue
                        if cat == 'riunione_generale':
                            event = single_general_event(title,pages)
                            if event: events.add((event['data'],event['ora_inizio'],event['ora_fine'],''))
                            else: reasons.append('estrazione_incompleta')
                        else:
                            count = 0
                            for _,text in pages:
                                lines = [clean(x) for x in text.splitlines() if clean(x)]
                                for i,line in enumerate(lines):
                                    for cls in matches_class(line):
                                        count += 1
                                        d,s,e = extract_nearby_schedule(lines,i)
                                        if d and s and e: events.add((d,s,e,cls))
                                        else: reasons.append('estrazione_incompleta')
                            if not count: reasons.append('estrazione_incompleta')
                    except Exception:
                        reasons.append('lettura_fallita'); item['lettura_completa']=False
                for d,s,e,cls in sorted(events):
                    if '2026-09-01' <= d <= '2027-08-31':
                        item['appuntamenti'].append({'data':d,'ora_inizio':s,'ora_fine':e,'classe':cls})
                    else: reasons.append('fuori_anno')
                if item['appuntamenti']: reasons.append('completo')
        except Exception:
            reasons.append('lettura_fallita'); item['lettura_completa']=False
    item['motivi'] = sorted(set(reasons))
    item['esito'] = ('esclusa' if not cat or any(x in reasons for x in ('dati_sensibili','tipo_non_supportato','rettifica'))
                     else 'completa' if item['appuntamenti'] and set(reasons)=={'completo'} else 'incerta')
    return item


def build(get=fetch):
    found,pages,errors = crawl(get)
    items = [analyze(n,t,u,get) for u,(n,t) in found.items()]
    counts = Counter(x['esito'] for x in items)
    return {'schema':'diagnostica-circolari-v1','anno_scolastico':'2026/2027',
            'generato_utc':datetime.now(timezone.utc).isoformat(),'archivio':ARCHIVE,
            'scrittura_agenda':False,'scrittura_proposte':False,
            'ambito':'Parser esistente: 2 A MAT, 4 A MAT, 4 B MAT e riunioni generali; intero anno, anche date passate. Altre convocazioni segnalate ma non estratte.',
            'limiti':'Riconoscimento per titolo; completezza sintattica, non validazione umana. Nessun OCR. Esclusioni preventive per possibili dati sensibili. Non rappresenta tutti gli eventi per tutte le classi.',
            'archivio_completo':not errors,'analisi_supportata_completa':not errors and all(x['lettura_completa'] for x in items),
            'pagine_archivio':pages,'errori_archivio':errors,
            'conteggi':{'circolari_totali':len(items),'convocazioni_riconosciute':sum(x['convocazione_riconosciuta'] for x in items),
                        'appuntamenti_completi':sum(len(x['appuntamenti']) for x in items),
                        'circolari_complete':counts['completa'],'circolari_incerte':counts['incerta'],'circolari_escluse':counts['esclusa']},
            'conteggi_motivi':dict(Counter(r for x in items for r in x['motivi'])),
            'legenda_motivi':REASON,'circolari':items}


def save(report,directory):
    directory.mkdir(parents=True,exist_ok=True)
    (directory/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    lines = ['# Diagnostica circolari pubbliche 2026/2027','',report['generato_utc'],'',
             f"Archivio completo: {report['archivio_completo']}. Pagine: {len(report['pagine_archivio'])}.",
             '',report['ambito'],'',report['limiti'],'','Nessuna scrittura su agenda o proposte. Nessun testo, titolo o PDF conservato.','']
    lines += [f'- {k}: {v}' for k,v in report['conteggi'].items()]
    lines += ['', '## Motivi (conteggi sovrapposti)','']
    lines += [f'- {r}: {n} — {REASON[r]}' for r,n in report['conteggi_motivi'].items()]
    lines += ['', '## Circolari','', '| Numero | Categoria | Esito | Appuntamenti | Motivi |','|---|---|---|---:|---|']
    lines += [f"| {x['numero']} | {x['categoria'] or '—'} | {x['esito']} | {len(x['appuntamenti'])} | {', '.join(x['motivi'])} |" for x in report['circolari']]
    if report['errori_archivio']: lines += ['', 'Errori archivio: '+', '.join(report['errori_archivio'])]
    (directory/'report.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')


if __name__=='__main__':
    report = build()
    save(report,Path('diagnostica-output'))
    print(json.dumps(report['conteggi']))
    raise SystemExit(0 if report['analisi_supportata_completa'] else 2)
