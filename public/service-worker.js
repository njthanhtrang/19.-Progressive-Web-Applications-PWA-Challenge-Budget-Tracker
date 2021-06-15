// don't need a <script> bc service worker fx in index.html does that
// service workers don't need webpack to work

const APP_PREFIX = "BudgetTracker-";
const VERSION = "version_01";
const CACHE_NAME = APP_PREFIX + VERSION;

// use relative paths bc page hosted at github.io/projectname
// didn't include images in assets bc browser's cache limit 50-250 MB
// from public
const FILES_TO_CACHE = [
  "/index.html",
  "/js/index.js",
  "/js/idb.js",
  "/css/styles.css",
  "/icons/icon-72x72.png",
  "/icons/icon-96x96.png",
  "/icons/icon-128x128.png",
  "/icons/icon-144x144.png",
  "/icons/icon-152x152.png",
  "/icons/icon-192x192.png",
  "/icons/icon-384x384.png",
  "/icons/icon-512x512.png",
  "/manifest.json",
];

// SW run before window obj is created
// instantiate listeners on SW
// self = SW obj
// e is event
self.addEventListener("install", function (e) {
  // tell browser to wait until work complete before terminating SW
  // ensures SW doesn't move on from installing phase until finish executing all code
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log("installing cache : " + CACHE_NAME);
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

// self.addEventListener("activate", function (e) {
//   e.waitUntil(
//     // .keys() returns array of all cache names
//     // keyList is a parameter that contains all cache names under <user>.github.io
//     caches.keys().then(function (keyList) {
//       // filter out caches that have the app prefix, store prefixed URLs in array
//       let cacheKeeplist = keyList.filter(function (key) {
//         // store in APP_PREFIX
//         return key.indexOf(APP_PREFIX);
//       });
//       // add current cache to keeplist
//       cacheKeeplist.push(CACHE_NAME);

//       return Promise.all(
//         //   if key can't be found in cacheKeeplist, will be deleted from cache
//         keyList.map(function (key, i) {
//             // returns -1 if item not found in keeplist, delete from cache
//           if (cacheKeeplist.indexOf(key) === -1) {
//             console.log("deleting cache : " + keyList[i]);
//             return caches.delete(keyList[i]);
//           }
//         })
//       );
//     })
//   );
// });

self.addEventListener("fetch", function (e) {
  // log URL of requested resource
  console.log("fetch request : " + e.request.url);
  //   if request is API req to our backend
  if (e.request.url.includes("/api/")) {
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // making original request
        return (
          fetch(e.request)
            .then((response) => {
              // if response worked
              if (response.status === 200) {
                //   update cache with request url and cloned response
                cache.put(e.request.url, response.clone());
              }
            //   return fetch response
              return response;
            })
            // if fetch didn't work, try to get from cache
            .catch((error) => {
              return cache.match(e.request);
            })
        );
      })
      // if we open cache and doesn't work
      .catch((error) => {
        console.error(error);
      });
  }

  // pessimistic caching, fetch before relying on cache
  // if not API req, try original fetch request
  e.respondWith(
    fetch(e.request).catch(() => {
      // original fetch does not work, (offline) handle it
      // try to match request in window cache
      return caches.match(e.request).then((response) => {
        // if request matches something in cache
        if (response) {
          // return response from cache
          return response;
        }
        // if no response, but req looking for html page
        else if (e.request.headers.get("accept").includes("text/html")) {
          // send cache result for home route
          return caches.match("/");
        } else {
          throw new Error("unable to fetch");
        }
      });
    })
  );

  // optimistic caching, rely on cache first, then make req if unavailable
  // intercept fetch req HTTP response, check to see if req is static file stored in cache or not
  //   e.respondWith(
  //     // determine if resource already exists in caches
  //     caches.match(e.request).then(function (request) {
  //       if (request) { // if cache available, respond with cache
  //         console.log("responding with cache : " + e.request.url);
  //         return request;
  //       } else { // if no cache, try fetching req from network
  //         // allow resource to be retrieved from online network as usual by SW
  //         console.log("file is not cached, fetching : " + e.request.url);
  //         return fetch(e.request);
  //       }
  //       // can omit if/else for console.log & put one line below like this too.
  //       // return request || fetch(e.request)
  //     })
  //   );
});
