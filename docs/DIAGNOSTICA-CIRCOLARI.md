# Diagnostica pubblica 2026/2027

Workflow `diagnostica-circolari.yml`, isolato dall'aggiornamento delle proposte e dai promemoria. Produce l'artifact `diagnostica-circolari-2026-2027` con report.json e report.md, conservato 7 giorni. Parte manualmente oppure al push del ramo diagnostico; non ha pianificazione, credenziali persistenti o permessi di scrittura. Il workflow esistente che aggiorna le proposte non è stato modificato né avviato.

Legge soltanto le schede dell'archivio filtrato con anno selezionato 2026, segue la paginazione mantenendo il filtro e deduplica per URL. Un limite di sicurezza o un errore rende esplicitamente parziale il risultato. Nessun limite silenzioso di 30 circolari o 6 allegati. Totale significa schede pubbliche trovate, non numero massimo di circolare; eventuali numeri mancanti non sono inventati.

Le convocazioni sono candidate riconosciute dal titolo, comprese altre tipologie non estratte. I conteggi distinguono circolari e appuntamenti. L'estrazione riusa le regole esistenti: soltanto 2 A MAT, 4 A MAT e 4 B MAT per i consigli di classe, più le riunioni generali supportate. Considera l'intero anno settembre 2026–agosto 2027, senza filtro sul futuro. Non è un censimento di tutti gli appuntamenti di tutte le classi. Un appuntamento completo ha data e intervallo orario espliciti: resta da verificare umanamente. PDF senza testo, errori e risultati ambigui sono segnalati. I motivi possono sovrapporsi; gli esiti delle circolari sono invece mutuamente esclusivi. Una circolare incerta può contenere appuntamenti completi e altri problemi.

Non effettua login, non usa segreti, Firebase o notifiche, non legge né scrive data/proposte-circolari.json. Titoli, URL delle singole circolari e allegati, testi e nomi non vengono salvati negli artifact o stampati. Possibili GLO, PEI, PDP e dati sensibili sono esclusi preventivamente; gli allegati non vengono conservati. Si pubblicano solo numero, identificatore, categoria, motivi e dati minimi degli appuntamenti riconosciuti. Si tratta di una precauzione automatica, non di una certificazione del contenuto del sito.

Verifiche locali: `python -m unittest discover -s scripts -p 'test_diagnostica_circolari.py'`.
Esecuzione: `python scripts/diagnostica_circolari.py`. Scrive esclusivamente in diagnostica-output/. Codice 2 indica analisi parziale; l'artifact viene caricato anche se il comando segnala errore.

Problemi riscontrati nel codice precedente: scansione dei link di tutta la pagina (inclusi suggerimenti di altri anni), massimo 30 candidate, massimo 6 PDF e regex di paginazione con doppio escape `\\d`. La diagnostica corregge questi problemi nel proprio percorso isolato, senza cambiare il comportamento dell'agenda.
