// set sw version
const CACHE_VER = 'VER_41';
const CACHE_STATIC = `RestoReviewsStatic_${CACHE_VER}`;
const CACHE_DYNAMIC = `RestoReviewsDynamic_${CACHE_VER}`;
const CACHE_MAX_ITEMS = 11;

// https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScri
// pts
self.importScripts('js/idb.min.js', '/js/dbhelper.js');

// set static cache / app shell
const appAssets = [
    '/',
    '/index.html',
    '/restaurant.html',
    '/offline.html',
    'css/styles.css',
    'css/my-styles.css',
    'css/css-reset.css',
    'js/dbhelper.js',
    'js/idb.min.js',
    'js/main.js',
    'js/restaurant_info.js',
    'img/offline.jpg',
    'img/dest/webp/1-md_1x.webp',
    'img/dest/webp/2-md_1x.webp',
    'img/dest/webp/3-md_1x.webp',
    'img/dest/webp/4-md_1x.webp',
    'img/dest/webp/5-md_1x.webp',
    'img/dest/webp/6-md_1x.webp',
    'img/dest/webp/7-md_1x.webp',
    'img/dest/webp/8-md_1x.webp',
    'img/dest/webp/9-md_1x.webp',
    'img/dest/webp/10-md_1x.webp',
    'img/dest/webp/not-a-restaurant.webp',
    'css/KFOlCnqEu92Fr1MmEU9fBBc4AMP6lQ.woff2'
];
// 'https://fonts.googleapis.com/css?family=Roboto:400,500',
// 'https://fonts.gstatic.com/s/roboto/v18/KFOlCnqEu92Fr1MmEU9fBBc4AMP6lQ.woff2'

async function trimCache(cacheName) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > CACHE_MAX_ITEMS) {
        cache
            .delete(keys[0])
            .then(trimCache(cacheName));
    }
}

function isInArray(string, array) {
    var cachePath;
    if (string.indexOf(self.origin) === 0) { // request targets domain where we serve the page from (i.e. NOT a CDN)
        //   console.log('matched ', string);
        cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
    } else {
        cachePath = string; // store the full request (for CDNs)
    }
    return array.indexOf(cachePath) > -1;
}

// install sw
self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_STATIC).then(cache => {
        // console.log('[SW INSTALL] Precaching Static');
        return cache.addAll(appAssets);
    }));
});

// activate sw
self.addEventListener('activate', e => {
    // debugger;
    e.waitUntil(caches.keys().then(keys => {
        return Promise.all(keys.map(key => {
            // if ( (key !== CACHE_STATIC || key !== CACHE_DYNAMIC) &&
            // (key.match('RestoReviewsStatic_') || key.match('RestoReviewsDynamic_'))) {
            if (key !== CACHE_STATIC && key !== CACHE_DYNAMIC) {
                // console.log('[DELETE CACHE KEY..] old keys');
                return caches.delete(key);
            }
        }))
    }).then(() => {
        // console.log('[ServiceWorker] Claiming clients for version');
        return self
            .clients
            .claim();
    }));
});

self.addEventListener('fetch', evt => {
    // solution courtesy of Maximillian Schwartzmuller strategy: network, then cache
    const getCustomResponsePromise = async() => {
        // const reviewURL = 'http://localhost:1337/reviews/?restaurant_id='; const
        // reviewURL = 'http://localhost:1337/';
        const reviewURL = 'https://resto-review-server.herokuapp.com/';

        try {
            if (evt.request.url.indexOf(reviewURL) > -1) {
                // console.log('[FETCH REVIEWS NET 1ST]');
                const cache = await caches.open(CACHE_DYNAMIC);
                const reviewResponse = await fetch(evt.request);
                trimCache(CACHE_DYNAMIC);
                cache.put(evt.request.url, reviewResponse.clone());
                return reviewResponse;
            } else if (isInArray(evt.request.url, appAssets)) {
                return caches.match(evt.request);
            } else {
                // get form cache first
                const cachedResponse = await caches.match(evt.request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                const netResponse = await fetch(evt.request);

                if (evt.request.url.match(location.origin)) {
                    let cache = await caches.open(CACHE_STATIC);
                    cache.put(evt.request.url, netResponse.clone());
                    return netResponse;
                } else {
                    let cache = await caches.open(CACHE_DYNAMIC);
                    trimCache(CACHE_DYNAMIC);
                    cache.put(evt.request.url, netResponse.clone());
                    return netResponse;
                }
            }

        } catch (error) {
            // return falback page
            console.log(`ERROR: ${error}`);
            const cache = await caches.open(CACHE_STATIC)
            return cache.match('/offline.html');
            // application/octet-stream image/png image/svg+xml
        }
    };

    evt.respondWith(getCustomResponsePromise());
});

self.addEventListener('sync', event => {
    if (event.tag === 'sync-reviews') {
        // https://www.kollegorna.se/en/2017/06/service-worker-gotchas/
        event.waitUntil(DBHelper.syncReviewToDatabaseServer().then(() => {
            // self.registration.showNotification('Reviews Successfully Synched to Database
            // Server');
            console.log('[SYNC TO BACKEND... Reviews Successfully Synched to Database Server]');
        }).catch(error => {
            console.log('Error Synching to Database Server', error);
        }));
    }

    if (event.tag === 'sync-favorite') {
        // console.log('[SYNCing TO BACKEND...  to Database Server]');
        event.waitUntil(DBHelper.syncFavoriteToDatabaseServer().then(() => {
            console.log('[SYNC TO BACKEND... Favorite Successfully Synched to Database Server]');
        }).catch(error => {
            console.log('Error Synching to Database Server', error);
        }));
    }
});

// ************** IMPROVEMENT RECOMMENDATIONS **************************
// https://developers.google.com/web/tools/lighthouse/audits/cache-policy
// https://css-tricks.com/snippets/javascript/loop-queryselectorall-matches/