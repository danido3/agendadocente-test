#!/usr/bin/env python3
"""Test locali, senza richieste al sito della scuola."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from estrai_riunioni_generali import type_for, single_general_event

class TestRiunioniGenerali(unittest.TestCase):
    def test_collegio_con_orario_esplicito(self):
        title="Circolare n. 103 - Convocazione Collegio docenti"
        pages=[(1,"Si comunica che il giorno 10 novembre 2026 dalle ore 15.00 alle ore 17.00 presso Aula Magna si terrà il Collegio dei docenti.")]
        p=single_general_event(title,pages)
        self.assertIsNotNone(p)
        self.assertEqual((p["data"],p["ora_inizio"],p["ora_fine"]),("2026-11-10","15:00","17:00"))
    def test_senza_fine_non_proporre(self):
        self.assertIsNone(single_general_event("Convocazione collegio docenti",[(1,"Il giorno 10 novembre 2026 alle ore 15:00 si svolgerà il collegio.")]))
    def test_date_diverse_non_proporre(self):
        self.assertIsNone(single_general_event("Convocazione collegio docenti",[(1,"Collegio docenti: il 10 novembre 2026 dalle ore 15:00 alle ore 16:00. Seconda riunione 11 novembre 2026 dalle ore 17:00 alle ore 18:00.")]))
    def test_consiglio_restera_al_parser_dedicato(self):
        self.assertIsNone(type_for("Convocazione consigli di classe"))
    def test_scadenza_non_e_riunione(self):
        self.assertIsNone(type_for("Circolare n. 8 scadenza iscrizioni"))
if __name__=="__main__":
    unittest.main()
