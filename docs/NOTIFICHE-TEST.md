# Agenda IPIA TEST — promemoria automatici (4.9.41)

**Non riguarda l'app ufficiale. Nessuna funzione a pagamento attivata.**

## Stato
- Web Push e FCM già provati sull'iPhone.
- La web app salva il campo `reminder` per ciascun **impegno**: `5` o `off`. Per gli impegni precedenti con campo vuoto vale `5`.
- `.github/workflows/reminders-test.yml` verifica gli impegni ogni cinque minuti (in funzione degli orari GitHub).
- Il programma **non invia nulla** finché manca il segreto `ACTIONS_REMINDERS_ENABLED` uguale a `true`.
- **GitHub Actions non garantisce puntualità al minuto**. Per evitare notifiche tardive, lo script non invia dopo l'orario iniziale.
- Il programma registra gli invii in Firestore sotto `users/{uid}/sentReminders/{hash}` per ridurre i duplicati.

## Attivazione sicura (esclusivamente dall'amministratore del progetto)
1. In Google Cloud Console del progetto `agenda-ipia`, creare un **account di servizio dedicato**, con sole autorizzazioni necessarie a leggere/scrivere Firestore e inviare Firebase Cloud Messaging. Evitare le credenziali amministratore generali.
2. Generare una credenziale JSON di questo account **solo se le policy del progetto lo permettono**, senza inserirla nel repository, in conversazioni o in screenshot.
3. Su GitHub aprire il repository **pubblico** `danido3/agendadocente-test` → Settings → Secrets and variables → Actions → New repository secret. Creare `FIREBASE_SERVICE_ACCOUNT_JSON` con il JSON completo. Non creare file JSON nel repo.
4. Inizialmente creare il segreto `ACTIONS_REMINDERS_ENABLED` con valore `false` oppure lasciarlo assente. In Actions → `Agenda IPIA TEST - promemoria` → Run workflow, scegliere `dry_run = true`. Le simulazioni non inviano notifiche.
5. Dopo aver verificato ruoli, messaggi e sincronizzazione, cambiare `ACTIONS_REMINDERS_ENABLED` a `true` per abilitarne l'invio. Prima fare una prova con un impegno fittizio e controllare i log.
6. Per arrestare gli invii basta cambiare `ACTIONS_REMINDERS_ENABLED` a `false` o eliminare il segreto.

## Note
- La data e l'ora sono interpretate nel fuso `Europe/Rome`, compresa l'ora legale.
- Vengono considerate solo le voci `type: event`, non le lezioni settimanali.
- I token restano in Firestore e sono letti solo sul server, non devono comparire nei log.
- Il piano Firebase **Spark** limita le operazioni Firestore; l'utilizzo deve restare nelle quote gratuite. Nessuna garanzia di consegna con GitHub Actions.
- Le service account keys sono credenziali sensibili. Se il progetto supporta Workload Identity Federation, è preferibile a chiavi JSON persistenti, ma richiede configurazione aggiuntiva.
