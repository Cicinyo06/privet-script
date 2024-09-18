// ==UserScript==
// @name         privet
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  privet
// @match        *://*/*
// @author       Siz
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const scriptNamespace = 'http://tampermonkey.net/';  // Kendi scriptlerinizi ayırt etmek için

    // 1. Tarayıcı eklentilerini gizle (plugins dizisini boş yap)
    Object.defineProperty(navigator, 'plugins', {
        get: () => []  // Boş dizi döndürerek eklentileri gizler
    });

    // 2. User-Agent bilgisini değiştirme (User-Agent spoofing)
    Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });

    // 3. Gizli HTML elementlerini bulup kaldırma (Gizli tespit için kullanılan elementleri sil)
    let hiddenElements = document.querySelectorAll('div[hidden]');
    hiddenElements.forEach(elem => elem.remove());

    // 4. Tarayıcıda çalışan bazı script'lerin tespiti ve durdurulması
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay) {
        // Kendi scriptlerinizi ayırt etmek için bir kontrol ekleyin
        if (callback.toString().includes(scriptNamespace)) {
            return originalSetTimeout(callback, delay);  // Kendi betiklerinizi engelleme
        }
        console.log('setTimeout engellendi:', callback);
    };

    // 5. Sayfanın tarayıcıda eklenti olup olmadığını anlamak için yaptığı testleri engellemek
    const originalQuerySelector = document.querySelector;
    document.querySelector = function(selector) {
        if (selector.includes(scriptNamespace)) {
            return originalQuerySelector.call(document, selector);  // Kendi betiklerinizi engelleme
        }
        console.log('querySelector engellendi:', selector);
        if (selector.includes('#suspiciousElement')) {
            return null;  // Şüpheli elemanları engelle
        }
        return originalQuerySelector.call(document, selector);
    };
})();
