#!/usr/bin/env python3
"""Indicizza solo convocazioni PUBBLICHE dei consigli di classe.
Non accede a pagine riservate, non archivia PDF e non modifica l'agenda.
Pubblica esclusivamente classe, data, orari e link al documento pubblico.
"""
import hashlib
import json
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo
from urllib.parse import urljoin, urlparse, parse_qs

from bs4 import BeautifulSoup
from test_pdf_circolare_92 import ROOT, ARCHIVE, get, find_pdfs, read_pdf, matches_class, clean
from proposte_circolare_92 import extract_nearby_schedule, CLASSES
from estrai_riunioni_generali import single_general_event, type_for

OUT = Path("data/proposte-circolari.json")
FILTERED_ARCHIVE = ARCHIVE + "?anno-scolastico=2026"
MAX_ARCHIVE_PAGES = 25
TODAY = datetime.now(ZoneInfo("Europe/Rome")).date()
MAX_DATE = TODAY + timedelta(days=370)
CIRC_RE = re.compile(r"circolare[-_]n[-_.]?(\d+)", re.I)
KEYWORDS = ("consigli-di-classe", "consigli di classe", "collegio", "dipartiment", "scuola-famiglia", "scuola famiglia", "ricevimento general", "incontro con le famiglie")
MAX_CIRCULARS = 30
MAX_PDFS = 6
MAX_PROPOSALS = 250

def candidates():
    """Consulta l'archivio filtrato 2026/27 e la paginazione, senza link di ricerca del sito."""
    found = {}
    visited = set()
    queue = [FILTERED_ARCHIVE]
    while queue and len(visited) < MAX_ARCHIVE_PAGES:
        page = queue.pop(0)
        if page in visited:
            continue
        visited.add(page)
        soup = BeautifulSoup(get(page).text, "html.parser")
        # Accetta soltanto link degli elementi dell'archivio.
        for a in soup.select("a[href]"):
            url = urljoin(page, a["href"])
            parsed = urlparse(url)
            if parsed.netloc != urlparse(ROOT).netloc:
                continue
            label = clean(a.get_text(" ", strip=True))
            slug = parsed.path.lower()
            if "/circolare/" in slug and slug.rstrip("/") != "/circolare":
                if not any(term in (slug + " " + label.lower()) for term in KEYWORDS):
                    continue
                m = CIRC_RE.search(slug)
                if m:
                    found[url] = (int(m.group(1)), label)
            # Le pagine di archivio conservano il parametro anno-scolastico.
            if re.fullmatch(r"/circolare/page/\\d+/?", parsed.path) and parse_qs(parsed.query).get("anno-scolastico") == ["2026"]:
                if url not in visited and url not in queue:
                    queue.append(url)
    print("Pagine archivio 2026/27 esaminate:", len(visited))
    return [(url, num, title) for url, (num, title) in list(found.items())[:MAX_CIRCULARS]]

def prior():
    if not OUT.exists():
        return []
    obj = json.loads(OUT.read_text(encoding="utf-8"))
    if obj.get("schema") != "agenda-ipia-proposte-v1":
        raise ValueError("Formato JSON esistente inatteso")
    return [p for p in obj.get("proposte", []) if isinstance(p, dict)]

def valid_proposal(p):
    try:
        return (p["stato"] == "da_verificare"
                and p["classe"] in set(CLASSES.values()) | {""}
                and re.fullmatch(r"\d{4}-\d{2}-\d{2}", p["data"]) is not None
                and p["ora_inizio"] < p["ora_fine"]
                and re.fullmatch(r"[012]\d:[0-5]\d", p["ora_inizio"]) is not None
                and re.fullmatch(r"[012]\d:[0-5]\d", p["ora_fine"]) is not None
                and isinstance(p["fonte"]["circolare"], int)
                and p["fonte"]["url"].startswith(ROOT + "/circolare/"))
    except (KeyError, TypeError):
        return False

def main():
    existing = prior()
    by_id = {p["id"]:p for p in existing if valid_proposal(p)}
    circulars = candidates()
    if not circulars:
        raise RuntimeError("Nessuna convocazione pubblica trovata: file precedente preservato")
    errors = 0
    found = 0
    for url, number, title in circulars:
        try:
            pdfs = find_pdfs(url)[:MAX_PDFS]
            for pdf_url, label in pdfs:
                try:
                    pages = read_pdf(pdf_url)
                except Exception:
                    errors += 1
                    continue
                # Convocazioni generali: solo una data e intervallo orario
                # espliciti, senza presumere durata o destinatari.
                general = single_general_event(title, pages)
                if general:
                    when=datetime.strptime(general["data"], "%Y-%m-%d").date()
                    if TODAY <= when <= MAX_DATE:
                        token=hashlib.sha256((url+"|generale|"+general["data"]).encode()).hexdigest()[:16]
                        general_entry={
                            "id":"circpub-"+token,
                            "titolo":general["titolo"],"classe":"",
                            "data":general["data"],"ora_inizio":general["ora_inizio"],
                            "ora_fine":general["ora_fine"],
                            "stato":"da_verificare",
                            "fonte":{"circolare":number,"url":url}
                        }
                        if valid_proposal(general_entry):
                            by_id[general_entry["id"]]=general_entry
                            found+=1
                if not ("consigli" in title.lower() and "classe" in title.lower()):
                    continue
                for pno, content in pages:
                    lines = [clean(x) for x in content.splitlines() if clean(x)]
                    for i, line in enumerate(lines):
                        classes = matches_class(line)
                        if not classes:
                            continue
                        date, start, end = extract_nearby_schedule(lines, i)
                        if not (date and start and end):
                            continue
                        when = datetime.strptime(date, "%Y-%m-%d").date()
                        if not TODAY <= when <= MAX_DATE:
                            continue
                        for cls in classes:
                            token = hashlib.sha256((url + "|" + cls + "|" + date).encode()).hexdigest()[:16]
                            stable_id = "circpub-" + token
                            entry = {"id":stable_id,
                                     "titolo":"Consiglio di classe " + CLASSES[cls],
                                     "classe":CLASSES[cls],"data":date,
                                     "ora_inizio":start,"ora_fine":end,
                                     "stato":"da_verificare",
                                     "fonte":{"circolare":number,"url":url}}
                            # Evita di riproporre appuntamenti gia' nel file di collaudo
                            # con un identificativo diverso ma stessi dati.
                            duplicate = any(
                                old.get("classe") == entry["classe"]
                                and old.get("data") == entry["data"]
                                and old.get("ora_inizio") == entry["ora_inizio"]
                                and old.get("ora_fine") == entry["ora_fine"]
                                and old.get("fonte", {}).get("circolare") == number
                                for old in by_id.values()
                            )
                            if duplicate:
                                continue
                            if valid_proposal(entry):
                                # Una rettifica con stessa chiave aggiorna la proposta;
                                # se e' gia' approvata nell'agenda, non la cambia da sola.
                                by_id[stable_id] = entry
                                found += 1
        except Exception as exc:
            errors += 1
            print("Circolare non elaborata:", number, type(exc).__name__)
    if errors and not found:
        raise RuntimeError("Controllo parziale senza risultati attendibili: preservo il file precedente")
    if len(by_id)>MAX_PROPOSALS:
        raise RuntimeError("Troppe proposte: pubblicazione bloccata")
    # Mantiene anche le proposte di collaudo gia' approvate o ignorate.
    # Evita riscritture quando non sono cambiati gli eventi.
    proposals = sorted(by_id.values(), key=lambda p:(p["data"],p["ora_inizio"],p["id"]))
    output = {"schema":"agenda-ipia-proposte-v1",
              "tipo":"circolari_pubbliche_riunioni",
              "proposte":proposals}
    serialized = json.dumps(output,ensure_ascii=False,indent=2)+"\n"
    previous=OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    if previous != serialized:
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(serialized, encoding="utf-8")
        print("File aggiornato: ",len(proposals),"proposte totali.")
    else:
        print("Nessuna modifica alle proposte.")
    print("Convocazioni analizzate:",len(circulars)," proposte riconosciute:",found,"errori lettura:",errors)
    print("Nessuna modifica diretta all'agenda.")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        print("Errore:",type(e).__name__,str(e)[:250],file=sys.stderr)
        sys.exit(1)
