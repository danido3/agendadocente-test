# Diagnostica pubblica 2026/2027 – regole personali

Il workflow diagnostica-circolari.yml produce report.json e report.md come artifact per 7 giorni, senza modificare agenda o data/proposte-circolari.json. Il percorso di aggiornamento automatico delle proposte non viene attivato da questa modifica. Il ramo diagnostico e la PR devono essere integrati separatamente prima di un eventuale utilizzo nell'app.

Categorie selezionate: tutti i GLO, consigli e scrutini delle classi 2 A MAT, 4 A MAT e 4 B MAT; collegi docenti; assemblee d'Istituto del corso diurno. Le semplici nomine di coordinatori e segretari sono escluse. Le categorie non selezionate restano fuori dall'estrazione. Le regole sono in scripts/regole_impegni.py e possono essere ampliate.

GLO: legge soltanto documenti pubblici, in memoria, senza autenticazione. Pubblica esclusivamente classe, data, intervallo orario e numero di circolare. Non salva nominativi, testi, titoli individuali, URL degli allegati o PDF. Intervalli diversi della stessa classe restano distinti; righe identiche sono deduplicate. Non deduce durata o identità dello studente. Le impaginazioni non riconosciute restano incerte.

Rettifiche, rinvii, annullamenti e aggiornamenti dell'ordine del giorno non generano nuovi appuntamenti. Il JSON include modifica, riferimenti_circolari (citazioni esplicite, da verificare) e variazioni_candidate. Non abbina automaticamente documenti sulla sola vicinanza dei numeri e non modifica eventi esistenti. I riferimenti nel testo possono essere semplici citazioni: non certificano da soli quale appuntamento sostituire.

Il censimento segue tutte le pagine mantenendo il filtro 2026; errori e limiti di sicurezza rendono il report parziale. L'estrazione copre tutto l'anno settembre 2026–agosto 2027, anche le date passate. Completezza significa data e intervallo sintatticamente validi, non approvazione umana. Nessun OCR. Conteggi dei motivi sovrapposti, esiti delle circolari mutuamente esclusivi.

Esecuzione: python scripts/diagnostica_circolari.py. Output solo in diagnostica-output/. Codice 2 segnala una lettura parziale; l'artifact viene comunque caricato. Test: python -m unittest discover -s scripts -p 'test_diagnostica_circolari.py'.
