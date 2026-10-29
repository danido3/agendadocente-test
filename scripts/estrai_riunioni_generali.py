"""Estrazione prudente di UNA convocazione generale per circolare pubblica.
Richiede nel documento una sola data futura e un intervallo orario completo.
Non tenta di dedurre orari mancanti, destinatari non espliciti o rettifiche.
"""
import re
from datetime import datetime
from proposte_circolare_92 import dates_in
MONTHS={"gennaio":1,"febbraio":2,"marzo":3,"aprile":4,"maggio":5,"giugno":6,
        "luglio":7,"agosto":8,"settembre":9,"ottobre":10,"novembre":11,"dicembre":12}
DATE_WORD=re.compile(r"(?<!\d)([0-3]?\d)\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(20\d{2})",re.I)
RANGE=re.compile(r"\b(?:dalle\s+)?(?:ore\s+)?([01]?\d|2[0-3])[:.]([0-5]\d)\s*(?:alle|fino\s+alle|[-–])\s*(?:ore\s+)?([01]?\d|2[0-3])[:.]([0-5]\d)",re.I)

TYPES=(
    ("collegio", "Collegio dei docenti"),
    ("dipartiment", "Riunione di dipartimento"),
    ("scuola-famiglia", "Incontro scuola-famiglia"),
    ("scuola famiglia", "Incontro scuola-famiglia"),
    ("ricevimento general", "Ricevimento generale genitori"),
    ("incontro con le famiglie", "Incontro scuola-famiglia"),
)
def type_for(title):
    value=" ".join(title.lower().replace("-"," ").split())
    if "consigli di classe" in value or "consiglio di classe" in value:
        return None
    for term,typ in TYPES:
        if term.replace("-"," ") in value:
            return typ
    return None

def dates_all(text):
    dates=set(dates_in(text))
    for day,month,year in DATE_WORD.findall(text):
        try:
            dates.add(datetime(int(year),MONTHS[month.lower()],int(day)).strftime("%Y-%m-%d"))
        except ValueError:
            continue
    return dates

def single_general_event(title,pages):
    typ=type_for(title)
    if not typ:
        return None
    # Accetta solo un singolo appuntamento non ambiguo nel documento.
    candidates=set()
    merged="\n".join(text for _,text in pages)
    flat=re.sub(r"\s+"," ",merged)
    # Non proporre convocazioni riservate a commissioni, coordinatori, referenti.
    low=flat.lower()
    if "collegio" in typ.lower() and not ("docenti" in low or "collegio docenti" in title.lower()):
        return None
    if typ=="Riunione di dipartimento" and not any(
        w in low for w in ("tutti i docenti","dipartimenti disciplinari","area tecnologica","laboratori tecnologici","mat")):
        return None
    # Cerca le date in un intorno ristretto a ogni orario esplicito.
    for m in RANGE.finditer(flat):
        start=f"{int(m.group(1)):02d}:{m.group(2)}"
        end=f"{int(m.group(3)):02d}:{m.group(4)}"
        if start>=end:continue
        context=flat[max(0,m.start()-170):min(len(flat),m.end()+170)]
        dates=dates_all(context)
        if len(dates)==1:
            candidates.add((next(iter(dates)),start,end))
    # L'intero documento deve contenere una sola data di riunione candidata
    # e un solo intervallo coerente. In caso contrario: revisione manuale.
    if len(candidates)!=1:
        return None
    date,start,end=next(iter(candidates))
    return {"titolo":typ,"data":date,"ora_inizio":start,"ora_fine":end}
