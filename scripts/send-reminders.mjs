// Agenda IPIA TEST: invio promemoria con FCM, senza servizi a pagamento.
// La credenziale va SOLO nel segreto GitHub FIREBASE_SERVICE_ACCOUNT_JSON.
import admin from 'firebase-admin';
import {DateTime} from 'luxon';
import {createHash} from 'node:crypto';

const dryRun=process.env.DRY_RUN==='true';
const enabled=process.env.ACTIONS_REMINDERS_ENABLED==='true';
if(!enabled&&!dryRun){console.log('Promemoria automatici disattivati; nessun invio.');process.exit(0)}
const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if(!raw){console.error('Manca il segreto FIREBASE_SERVICE_ACCOUNT_JSON');process.exitCode=1}
else {
 let credential;
 try{credential=JSON.parse(raw)}catch{throw new Error('Segreto Firebase non valido: JSON non leggibile')}
 admin.initializeApp({credential:admin.credential.cert(credential),projectId:'agenda-ipia'});
 const db=admin.firestore(), messaging=admin.messaging();
 const now=DateTime.now().setZone('Europe/Rome');
 console.log('Verifica promemoria TEST alle',now.toFormat('yyyy-MM-dd HH:mm ZZZZ'),dryRun?'(solo simulazione)':'');
 // Interroga i token, non l'intero database delle agende.
 const tokens=await db.collectionGroup('pushTokens').get();
 const grouped=new Map();
 for(const doc of tokens.docs){
  if(doc.data().app!=='agenda-ipia-test'||!doc.data().token)continue;
  const userRef=doc.ref.parent.parent;
  if(!userRef||userRef.parent.id!=='users')continue;
  const uid=userRef.id;
  if(!grouped.has(uid))grouped.set(uid,[]);
  grouped.get(uid).push(doc.data().token);
 }
 let checked=0,due=0,sent=0;
 for(const [uid,deviceTokens] of grouped){
  if(++checked>100){console.warn('Limite di sicurezza: massimo 100 utenti per esecuzione');break}
  const agenda=await db.doc('users/'+uid+'/data/agenda').get();
  const entries=agenda.data()?.snapshot?.entries;
  if(!Array.isArray(entries))continue;
  for(const item of entries){
   if(item?.type!=='event'||!item.id||!item.subject||!item.date||!item.start||item.reminder==='off')continue;
   if(item.reminder && !['5',''].includes(String(item.reminder)))continue;
   const start=DateTime.fromISO(item.date+'T'+item.start,{zone:'Europe/Rome'});
   if(!start.isValid)continue;
   const minutesBefore=start.diff(now,'minutes').minutes;
   // La verifica ogni 5 minuti può avere ritardi: nessuna notifica dopo l'inizio.
   if(minutesBefore<=0||minutesBefore>5)continue;
   due++;
   const fingerprint=createHash('sha256').update([item.id,item.date,item.start,'5'].join('|')).digest('hex');
   const marker=db.doc('users/'+uid+'/sentReminders/'+fingerprint);
   if(dryRun){console.log('Promemoria in scadenza individuato (simulazione).');continue}
   let reserved=false;
   await db.runTransaction(async tx=>{
    const existing=await tx.get(marker);
    if(existing.exists)return;
    tx.create(marker,{createdAt:admin.firestore.FieldValue.serverTimestamp(),eventId:item.id,status:'pending',startAt:start.toISO()});
    reserved=true;
   });
   if(!reserved)continue;
   try{
    const unique=[...new Set(deviceTokens)].slice(0,500);
    const response=await messaging.sendEachForMulticast({
     tokens:unique,
     notification:{title:'Agenda IPIA · Promemoria',body:item.subject+' inizia alle '+item.start},
     webpush:{fcmOptions:{link:'https://danido3.github.io/agendadocente-test/'}},
     data:{kind:'reminder',eventId:String(item.id)}
    });
    if(response.successCount===0)throw new Error('Nessun dispositivo ha ricevuto il messaggio da FCM');
    await marker.update({status:'sent',sentAt:admin.firestore.FieldValue.serverTimestamp(),successCount:response.successCount,failureCount:response.failureCount});
    sent+=response.successCount;
   }catch(err){
    await marker.delete();
    console.error('Errore invio (riprovabile):',err.message);
    process.exitCode=1;
   }
  }
 }
 console.log('Utenti verificati:',checked,'promemoria dovuti:',due,'invii FCM accettati:',sent);
}
