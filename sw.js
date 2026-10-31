const CACHE='agenda-ipia-test-v4-9-46-rame-corallo-20261031';
const ASSETS=['./','./index.html','./css/styles.css','./js/app.js','./js/firebase-auth.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('agenda-ipia-test-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
const url=new URL(e.request.url);
if(url.pathname.endsWith('/version.json')){e.respondWith(fetch(e.request,{cache:'no-store'}));return}
e.respondWith(fetch(e.request).then(r=>{if(r.ok&&(e.request.mode==='navigate'||ASSETS.some(a=>url.pathname.endsWith('/'+a.replace('./',''))))){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{})}return r}).catch(()=>caches.match(e.request)))});
