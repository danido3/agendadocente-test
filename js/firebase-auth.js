// Agenda IPIA TEST 4.9.35: accesso Google, senza sincronizzazione dei dati
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
const app=initializeApp({
  apiKey:'AIzaSyBhGhWO4S1kwkncXXSb6k-hfgM99V7lQ9w',
  authDomain:'agenda-ipia.firebaseapp.com',
  projectId:'agenda-ipia',
  storageBucket:'agenda-ipia.firebasestorage.app',
  messagingSenderId:'505492164166',
  appId:'1:505492164166:web:513e9e96d49d77dabd4447'
});
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const db=getFirestore(app);
const auth=getAuth(app),provider=new GoogleAuthProvider();
const status=document.getElementById('firebaseAuthStatus');
const login=document.getElementById('firebaseLogin');
const logout=document.getElementById('firebaseLogout');
const cloudUpload=document.getElementById('cloudUpload'),cloudDownload=document.getElementById('cloudDownload'),cloudStatus=document.getElementById('cloudStatus');
let currentUser=null;const cloudPath=()=>doc(db,'users',currentUser.uid,'data','agenda');
function cloudMessage(t){cloudStatus.textContent=t}

function message(s){status.textContent=s}
onAuthStateChanged(auth,user=>{
  currentUser=user;login.hidden=!!user;logout.hidden=!user;cloudUpload.hidden=!user;cloudDownload.hidden=!user;
  cloudMessage(user?'Cloud pronto per trasferimenti manuali. Nessuna sincronizzazione automatica.':'Accedi per trasferire i dati.');
  message(user?'Connesso come '+(user.email||user.displayName||'utente Google')+'. Sincronizzazione cloud non ancora attiva.':'Non connesso. I dati continuano a essere salvati soltanto su questo dispositivo.');
},err=>message('Impossibile verificare l’accesso: '+err.message));
login.addEventListener('click',async()=>{
  login.disabled=true;message('Apertura accesso Google…');
  try{await signInWithPopup(auth,provider)}
  catch(e){message(e.code==='auth/popup-blocked'?'Popup bloccato: consenti i popup e riprova.':'Accesso non riuscito: '+(e.code||e.message))}
  finally{login.disabled=false}
});
logout.addEventListener('click',async()=>{
  logout.disabled=true;
  try{await signOut(auth)}catch(e){message('Disconnessione non riuscita: '+e.message)}
  finally{logout.disabled=false}
});

async function cloudAction(kind){
 if(!currentUser){cloudMessage('Accedi con Google prima di continuare.');return}
 const user=currentUser,buttons=[cloudUpload,cloudDownload];buttons.forEach(b=>b.disabled=true);
 try{
  const ref=cloudPath(),remote=await getDoc(ref);
  if(auth.currentUser?.uid!==user.uid)throw Error('Account cambiato: riprova');
  if(kind==='upload'){
   const msg=remote.exists()?'Nel cloud esiste già un’agenda. SOSTITUIRLA con i dati locali di questo dispositivo?':'Caricare nel cloud una copia completa dei dati di questo dispositivo?';
   if(!confirm(msg)){cloudMessage('Caricamento annullato.');return}
   const snapshot=window.agendaCloudExport();
   await setDoc(ref,{snapshot,updatedAt:serverTimestamp(),schema:1});
   cloudMessage('Caricamento completato. I dati locali non sono stati modificati.');
  }else{
   if(!remote.exists()){cloudMessage('Nel cloud non ci sono ancora dati. Caricali prima dal dispositivo principale.');return}
   const payload=remote.data();
   if(!payload||payload.schema!==1||!payload.snapshot)throw Error('Archivio cloud non riconosciuto');
   const snap=payload.snapshot,n=(snap.entries||[]).length;
   if(!confirm('Scaricare '+n+' voci dal cloud? I dati LOCALI di questo browser saranno SOSTITUITI. Prima verrà creata una copia locale di sicurezza.')){cloudMessage('Download annullato.');return}
   window.agendaCloudImport(snap);
   cloudMessage('Download completato: '+n+' voci caricate. Copia di sicurezza locale creata.');
  }
 }catch(e){cloudMessage('Operazione non riuscita: '+(e.code||e.message))}
 finally{buttons.forEach(b=>b.disabled=false)}
}
cloudUpload.addEventListener('click',()=>cloudAction('upload'));
cloudDownload.addEventListener('click',()=>cloudAction('download'));
