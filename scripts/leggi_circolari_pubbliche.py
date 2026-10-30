#!/usr/bin/env python3
"""Prima prova: indicizzazione delle circolari PUBBLICHE, senza login e senza dati personali."""
import json
import re
import sys
from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.parse import urljoin, urlparse

SOURCE = "https://www.ipsiaiglesias.edu.it/circolare/"
class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.href = None
        self.text = []
        self.links = []
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.href = dict(attrs).get("href")
            self.text = []
    def handle_data(self, data):
        if self.href is not None:
            self.text.append(data)
    def handle_endtag(self, tag):
        if tag == "a" and self.href is not None:
            title = " ".join(" ".join(self.text).split())
            self.links.append((self.href, title))
            self.href = None
            self.text = []
def main():
    req = Request(SOURCE, headers={"User-Agent": "AgendaIPIA-Test/0.1 (public archive check)"})
    with urlopen(req, timeout=25) as response:
        html = response.read(3_000_000).decode("utf-8", errors="replace")
    parser = Links()
    parser.feed(html)
    found = {}
    for href, label in parser.links:
        url = urljoin(SOURCE, href)
        if urlparse(url).netloc != "www.ipsiaiglesias.edu.it":
            continue
        if "/circolare/" not in urlparse(url).path or url.rstrip("/") == SOURCE.rstrip("/"):
            continue
        number = re.search(r"circolare\s*n[.°º]?\s*(\d+)", label, flags=re.I)
        if not number:
            continue
        found[url] = {"numero": int(number.group(1)), "titolo": label[:300], "url": url}
    items = list(found.values())
    data = {"fonte": SOURCE, "controllato_il": datetime.now(timezone.utc).isoformat(), 
            "tipo": "solo_circolari_pubbliche", "quantita": len(items), "circolari": items}
    with open("circolari_pubbliche_test.json", "w", encoding="utf-8") as fp:
        json.dump(data, fp, ensure_ascii=False, indent=2)
    print(f"Circolari pubbliche individuate: {len(items)}")
    for item in items[:10]:
        print(f"n. {item['numero']} | {item['titolo'][:90]}")
    if not items:
        print("Nessun elemento individuato: verificare struttura del sito.", file=sys.stderr)
        return 1
    return 0
if __name__ == "__main__":
    sys.exit(main())
