#!/usr/bin/env python3
"""Secondo test: leggi PDF PUBBLICI della circolare 92, estrai righe delle classi.
Nessun login, nessuna scrittura su Firebase o sull'agenda.
"""
import json
import re
import sys
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
import fitz

ROOT = "https://www.ipsiaiglesias.edu.it"
ARCHIVE = ROOT + "/circolare/"
HEADERS = {"User-Agent": "AgendaIPIA-Test/0.2 (verifica documenti pubblici)"}
TARGETS = ["2 A MAT", "4 A MAT", "4 B MAT"]
MAX_BYTES = 12 * 1024 * 1024

def get(url):
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    if len(r.content) > MAX_BYTES:
        raise ValueError("Documento troppo grande per il test")
    return r

def clean(s):
    return " ".join(s.split())

def matches_class(text):
    normalized = re.sub(r"[^A-Z0-9]", "", text.upper().replace("ª", "").replace("°", ""))
    return [x for x in TARGETS if re.sub(r"[^A-Z0-9]", "", x) in normalized]

def find_circular():
    soup = BeautifulSoup(get(ARCHIVE).text, "html.parser")
    candidates = []
    for a in soup.select("a[href]"):
        href = urljoin(ARCHIVE, a.get("href", ""))
        if urlparse(href).netloc != urlparse(ROOT).netloc or "/circolare/" not in urlparse(href).path:
            continue
        title = clean(a.get_text(" ", strip=True))
        slug = urlparse(href).path.lower()
        if re.search(r"\bcircolare\s*n\.?\s*92\b", title, re.I) or re.search(r"(?:circolare|circ)[-_]?(?:n[-_.]?)?92(?:[-/.]|$)", slug):
            candidates.append((href, title))
    # Prefer links naming the class councils, not an unrelated item with number 92.
    candidates.sort(key=lambda x: ("consigli" not in x[1].lower() and "consigli" not in x[0].lower(),len(x[0])))
    if not candidates:
        raise RuntimeError("Circolare 92 non trovata nella prima pagina dell'archivio")
    return candidates[0][0], candidates[0][1]

def find_pdfs(page):
    soup = BeautifulSoup(get(page).text, "html.parser")
    out = []
    for a in soup.select("a[href]"):
        href = urljoin(page, a["href"])
        if urlparse(href).netloc != urlparse(ROOT).netloc:
            continue
        label = clean(a.get_text(" ", strip=True))
        path = urlparse(href).path.lower()
        if path.endswith(".pdf") or ("/wp-content/uploads/" in path and "pdf" in href.lower()):
            out.append((href,label))
    return list(dict(((url,label) for url,label in out)).items())

def read_pdf(url):
    content = get(url).content
    if not content.startswith(b"%PDF-"):
        raise ValueError("L'allegato non e' un PDF valido")
    doc = fitz.open(stream=content, filetype="pdf")
    if doc.page_count > 80:
        raise ValueError("Numero di pagine superiore al limite del test")
    return [(i+1, p.get_text(sort=True)) for i,p in enumerate(doc)]

def main():
    result = {"tipo":"test_pdf_pubblici", "circolare":"92", 
              "data_controllo_utc":datetime.now(timezone.utc).isoformat(),
              "classi_cercate":TARGETS, "documenti":[], "righe_pertinenti":[],
              "avvertenza":"Non sono appuntamenti verificati; nessun inserimento in agenda."}
    page,title = find_circular()
    result["pagina_circolare"] = page
    print("Circolare individuata:",title[:150])
    pdfs = find_pdfs(page)
    print("Link PDF diretti:",len(pdfs))
    for url,label in pdfs[:12]:
        item = {"url":url,"descrizione":label[:140]}
        try:
            pages=read_pdf(url)
            item["pagine"]=len(pages)
            item["caratteri_estratti"]=sum(len(text) for _,text in pages)
            for page_num,text in pages:
                lines=[clean(line) for line in text.splitlines() if clean(line)]
                for i,line in enumerate(lines):
                    target=matches_class(line)
                    if target:
                        result["righe_pertinenti"].append({
                            "documento":url,"pagina":page_num,"classi":target,
                            "contesto":lines[max(0,i-2):min(len(lines),i+3)]
                        })
        except Exception as e:
            item["errore"]=str(e)[:180]
        result["documenti"].append(item)
    with open("test_circolare_92.json","w",encoding="utf-8") as f:
        json.dump(result,f,ensure_ascii=False,indent=2)
    print("Documenti PDF esaminati:",len(result["documenti"]))
    print("Righe relative alle classi:",len(result["righe_pertinenti"]))
    for item in result["righe_pertinenti"][:15]:
        print("Pagina",item["pagina"],"|",", ".join(item["classi"]),"|", " / ".join(item["contesto"])[:300])
    if not pdfs:
        print("ERRORE: nessun link PDF diretto individuato; verificare allegati nella pagina.",file=sys.stderr)
        return 1
    if not result["righe_pertinenti"]:
        print("ATTENZIONE: nessuna classe estratta; controllare PDF, eventuali scansioni o impaginazione.",file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
