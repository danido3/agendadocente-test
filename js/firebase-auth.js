// Agenda IPIA TEST 4.9.34: accesso Google, senza sincronizzazione dei dati
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
const auth=getAuth(app),provider=new GoogleAuthProvider();
const status=document.getElementById('firebaseAuthStatus');
const login=document.getElementById('firebaseLogin');
const logout=document.getElementById('firebaseLogout');
function message(s){status.textContent=s}
onAuthStateChanged(auth,user=>{
  login.hidden=!!user;logout.hidden=!user;
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
