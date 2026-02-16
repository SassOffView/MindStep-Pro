const CACHE_NAME='mindstep-v5.2';
const urlsToCache=['./','. /index.html','./manifest.json'];

self.addEventListener('install',e=>{
e.waitUntil(
caches.open(CACHE_NAME).then(cache=>cache.addAll(urlsToCache)).then(()=>self.skipWaiting())
);
});

self.addEventListener('fetch',e=>{
e.respondWith(
caches.match(e.request).then(response=>{
if(response)return response;
return fetch(e.request).then(response=>{
if(!response||response.status!==200||response.type!=='basic')return response;
const responseToCache=response.clone();
caches.open(CACHE_NAME).then(cache=>cache.put(e.request,responseToCache));
return response;
});
})
);
});

self.addEventListener('activate',e=>{
e.waitUntil(
caches.keys().then(cacheNames=>{
return Promise.all(
cacheNames.map(cacheName=>{
if(cacheName!==CACHE_NAME)return caches.delete(cacheName);
})
);
}).then(()=>self.clients.claim())
);
});
