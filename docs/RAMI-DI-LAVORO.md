# Rami di lavoro separati – 30 ottobre 2026

Repository di lavoro: danido3/agendadocente-test. Il repository ufficiale danido3/agendadocente non è stato modificato.

- test-pulito: copia esatta dei file ufficiali 4.9.38, commit 4131bf9579cded8a5d4b61aeb68cbbb591981601. Base per nuove modifiche indipendenti.
- notifiche: snapshot del lavoro notifiche prima dell'inizio delle circolari (ea75a5c3c4dfa919bc50c07409d4b3923731ba53), con avvio del workflow solo manuale.
- riconoscimento-circolari: file ufficiali più interfaccia, proposte, script e diagnostica delle circolari fino a ce1703ff2b9f60de7a352f8666a05dca4e408eda; nessuna aggiunta push/promemoria. Workflow solo manuali.

La funzionalità sperimentale rimane incompleta: la riorganizzazione non implementa nuove funzioni. I workflow manuali possono comunque inviare notifiche o aggiornare le proposte secondo la propria configurazione: non sono stati eseguiti durante la separazione.

Storico integrale conservato in main e codex/diagnostica-circolari-2026, oltre ai riferimenti archivio/main-misto-2026-10-30 e archivio/circolari-miste-2026-10-30. La PR 1 è lo storico misto, non il ramo da integrare per riprendere le sole circolari.

Nessun cambio del ramo predefinito, della pubblicazione Pages, di Firebase o dei dati agenda. main conserva i workflow preesistenti: questa operazione non li disabilita a livello repository. I tre rami sono separazioni del codice, non tre siti pubblicati né tre database indipendenti; ereditano la configurazione Firebase esistente.

Per riprendere un lavoro scegliere esplicitamente il relativo ramo e creare una nuova PR, senza integrare i rami archivio.
