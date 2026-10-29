#!/usr/bin/env python3
"""Terza prova: genera proposte da verificare, SENZA salvare eventi in Agenda IPIA."""
import json
import re
import sys
from datetime import datetime, timezone
from test_pdf_circolare_92 import find_circular, find_pdfs, read_pdf, TARGETS, matches_class, clean

DATE_RE = re.compile(r"(?<!\d)([0-3]?\d)[/.-]([01]?\d)[/.-](20\d\d)(?!\d)")
TIME_RE = re.compile(r"(?<!\d)([01]?\d|2[0-3])[:.]([0-5]\d)(?!\d)")
CLASSES = {"2 A MAT":"2ª A MAT","4 A MAT":"4ª A MAT","4 B MAT":"4ª B MAT"}

def dates_in(text):
    found=[]
    for d,m,y in DATE_RE.findall(text):
        try: found.append(datetime(int(y),int(m),int(d)).strftime("%Y-%m-%d"))
        except ValueError: pass
    return list(dict.fromkeys(found))

def times_in(text):
    return list(dict.fromkeys(f"{int(h):02d}:{int(m):02d}" for h,m in TIME_RE.findall(text)))

def extract_nearby_schedule(lines, index):
    """Estrae data e orari dalla struttura visibile: Dalle nella riga classe,
    Alle nelle successive; data nelle 4 righe adiacenti.
    Se trova ambiguita', lascia il campo vuoto."""
    line = lines[index]
    start_match = re.search(r"\\bDalle\\s+([01]?\\d|2[0-3])[:.]([0-5]\\d)", line, re.I)
    start = (f"{int(start_match.group(1)):02d}:{start_match.group(2)}"
             if start_match else None)
    end = None
    for j in range(index + 1, min(len(lines), index + 4)):
        if re.search(r"\\bDalle\\s+\\d", lines[j], re.I):
            break  # Nuova riunione: non prendere il suo orario finale.
        m = re.search(r"\\bAlle\\s+([01]?\\d|2[0-3])[:.]([0-5]\\d)", lines[j], re.I)
        if m:
            end = f"{int(m.group(1)):02d}:{m.group(2)}"
            break
    if not (start and end and start < end):
        start, end = None, None
    candidates=[]
    for j in range(max(0,index-4), min(len(lines),index+5)):
        for date in dates_in(lines[j]):
            candidates.append((abs(j-index), date))
    distinct = sorted(set(date for _,date in candidates))
    date = distinct[0] if len(distinct)==1 else None
    return date,start,end

def extract():
    url,title=find_circular()
    pdfs=find_pdfs(url)
    if not pdfs:
        raise RuntimeError("Nessun PDF nella circolare")
    result={"schema":"agenda-ipia-proposte-v1","origine":"circolare_pubblica",
            "numero_circolare":92,"url_circolare":url,"titolo_circolare":title,
            "generato_il_utc":datetime.now(timezone.utc).isoformat(),
            "scrittura_agenda":False,"proposte":[],"diagnostica":[]}
    seen=set()
    for pdf_url,label in pdfs[:12]:
        try: pages=read_pdf(pdf_url)
        except Exception as exc:
            result["diagnostica"].append({"documento":pdf_url,"errore":str(exc)[:160]})
            continue
        for pno,raw in pages:
            lines=[clean(x) for x in raw.splitlines() if clean(x)]
            # Una data intestazione puo' essere su una riga precedente alla classe.
            # Non si assume una data in caso di piu' date possibili nel contesto.
            for i,line in enumerate(lines):
                classes=matches_class(line)
                if not classes: continue
                before=lines[max(0,i-12):i]
                after=lines[i+1:min(len(lines),i+5)]
                local=[line]+after[:3]
                date_value, start, end = extract_nearby_schedule(lines, i)
                for cls in classes:
                    key=(cls,pdf_url,pno,line)
                    if key in seen:continue
                    seen.add(key)
                    valid_date=date_value
                    proposal={
                      "id":f"circ-92-{cls.lower().replace(' ','-')}-{len(result['proposte'])+1}",
                      "titolo":f"Consiglio di classe {CLASSES[cls]}",
                      "classe":CLASSES[cls],
                      "data":valid_date,
                      "ora_inizio":start,"ora_fine":end,
                      "stato":"da_verificare",
                      "approvazione_richiesta":True,
                      "completa":bool(valid_date and start and end),
                      "fonte":{"circolare":92,"url":url,"pdf":pdf_url,"pagina":pno},
                      "estratto_originale":line[:350],
                      "contesto":(before[-3:]+local)[:8],
                      "nota":"Data e orari nulli se ambigui nelle righe vicine; verificare sul PDF prima di approvare."
                    }
                    result["proposte"].append(proposal)
    with open("proposte_circolare_92_test.json","w",encoding="utf-8") as f:
        json.dump(result,f,ensure_ascii=False,indent=2)
    print("Proposte individuate:",len(result["proposte"]))
    for p in result["proposte"]:
        print(f"{p['classe']} | data={p['data'] or 'DA VERIFICARE'} | "
              f"orario={p['ora_inizio'] or '?'}-{p['ora_fine'] or '?'} | pagina={p['fonte']['pagina']}")
    print("DIAGNOSTICA TABELLE - righe vicine alle classi:")
    for p in result["proposte"]:
        print("---",p["classe"],"pagina",p["fonte"]["pagina"],"---")
        for line in p["contesto"]:
            print("  ",line[:240])
    print("ATTENZIONE: nessun evento e' stato inserito nell'agenda.")
    return 0 if result["proposte"] else 1

if __name__=="__main__":
    try: sys.exit(extract())
    except Exception as exc:
        print("Errore nell'estrazione:",exc,file=sys.stderr)
        sys.exit(1)
