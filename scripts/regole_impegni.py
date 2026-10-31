"""Regole personali; produce esclusivamente classe, data e orari."""
import re
from estrai_riunioni_generali import dates_all, RANGE
from proposte_circolare_92 import extract_nearby_schedule
CLASSI=('2 A MAT','4 A MAT','4 B MAT')
def classi_in(text):
    text=text.upper().replace('ª','').replace('°','').replace('^','').replace('º','')
    return [c for c in CLASSI if re.search(r'(?<![A-Z0-9])'+c.replace(' ',r'\s*')+r'(?![A-Z0-9])',text)]
def categoria(title):
    t=title.lower()
    if re.search(r'\bnomina\b|coordinatori|segretari',t): return None
    if re.search(r'\bglo\b',t): return 'glo'
    if 'scrutin' in t: return 'scrutini'
    if re.search(r'consigl(?:io|i) di classe',t): return 'consigli_di_classe'
    if 'collegio' in t and 'docent' in t: return 'riunione_generale'
    if re.search(r'assemblea.*istituto',t): return 'assemblea_diurna' if 'diurno' in t else 'altra_convocazione'
    return 'altra_convocazione' if re.search(r'convocazion|assemblea|riunione|dipartiment',t) else None
def modifica(title):
    if re.search(r'aggiornamento.*ordine del giorno',title,re.I): return 'ordine_del_giorno'
    if re.search(r'annull',title,re.I): return 'annullamento'
    if re.search(r'rettifica|rinvio|variazione',title,re.I): return 'rettifica'
    return None
def riferimenti(text,number):
    return sorted({int(n) for n in re.findall(r'circolare\s+(?:n[.°]?\s*)?(\d+)',text,re.I) if int(n)!=number})
def estrai(title,pages,cat):
    events=set(); incomplete=False
    for _,text in pages:
        lines=[' '.join(x.split()) for x in text.splitlines() if x.strip()]
        if cat in ('riunione_generale','assemblea_diurna'):
            flat=' '.join(lines); candidates=set()
            for m in RANGE.finditer(flat):
                dates=dates_all(flat[max(0,m.start()-170):m.end()+170])
                start=f'{int(m[1]):02d}:{m[2]}'; end=f'{int(m[3]):02d}:{m[4]}'
                if len(dates)==1 and start<end: candidates.add((next(iter(dates)),start,end,''))
            if len(candidates)==1: events.update(candidates)
            else: incomplete=True
        else:
            matched=False
            for i,line in enumerate(lines):
                classes=classi_in(line)
                if not classes: continue
                matched=True
                d,s,e=extract_nearby_schedule(lines,i)
                dates=dates_all(line); ranges=list(RANGE.finditer(line))
                if len(dates)==1 and len(ranges)==1:
                    m=ranges[0]; d=next(iter(dates)); s=f'{int(m[1]):02d}:{m[2]}'; e=f'{int(m[3]):02d}:{m[4]}'
                if d and s and e and s<e:
                    for cls in classes: events.add((d,s,e,cls))
                else: incomplete=True
            if not matched: incomplete=True
    return events,incomplete
