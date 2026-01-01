// Service Worker - Makes the app work offline
// This file runs separately from the main app

// Cache name - update this version number when you change files
// This forces the browser to download new versions
const CACHE_NAME = 'daily-checklist-v1';

// List of files to cache for offline use
const FILES_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json'
];

// ============================================
// INSTALL EVENT
// ============================================
// This runs when the service worker is first installed
// It downloads and caches all necessary files

self.addEventListener('install', function(event) {
    console.log('Service Worker: Installing...');
    
    // Wait until caching is complete before finishing installation
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Service Worker: Caching files');
                return cache.addAll(FILES_TO_CACHE);
            })
            .then(function() {
                // Take control immediately without waiting
                return self.skipWaiting();
            })
    );
});

// ============================================
// ACTIVATE EVENT
// ============================================
// This runs when the service worker takes control
// It cleans up old caches from previous versions

self.addEventListener('activate', function(event) {
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        // Get all cache names
        caches.keys()
            .then(function(cacheNames) {
                return Promise.all(
                    cacheNames.map(function(cacheName) {
                        // Delete old caches that don't match current version
                        if (cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(function() {
                // Take control of all pages immediately
                return self.clients.claim();
            })
    );
});

// ============================================
// FETCH EVENT
// ============================================
// This intercepts all network requests
// It serves cached files when offline

self.addEventListener('fetch', function(event) {
    // Respond to the request
    event.respondWith(
        // Try to find the request in cache
        caches.match(event.request)
            .then(function(response) {
                // If found in cache, return it
                if (response) {
                    return response;
                }
                
                // If not in cache, fetch from network
                return fetch(event.request)
                    .then(function(response) {
                        // Check if valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response (can only use it once)
                        const responseToCache = response.clone();
                        
                        // Add to cache for future offline use
                        caches.open(CACHE_NAME)
                            .then(function(cache) {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(function() {
                        // Network failed and not in cache
                        // Could return a custom offline page here
                        console.log('Service Worker: Fetch failed for:', event.request.url);
                    });
            })
    );
});