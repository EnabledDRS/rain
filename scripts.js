diff --git a/scripts.js b/scripts.js
index b114273db9b0247c19236adfe3f702b9a053a52a..be458728d3b8c2918f89f1e952daa786a188c002 100644
--- a/scripts.js
+++ b/scripts.js
@@ -4,55 +4,70 @@ document.addEventListener('DOMContentLoaded', async function () {
     const slider = document.getElementById('time-slider');
     const speedDisplay = document.querySelector('.speed-display');
     const playPauseButton = document.querySelector('.pause-btn');
     const slowerButton = document.getElementById('slower');
     const fasterButton = document.getElementById('faster');
     const lastRefresh = document.querySelector('.refresh-time');
     const timeDisplay = document.querySelector('.image-time');
     const nowDisplay = document.querySelector('.now');
     const centerCheckbox = document.getElementById('center');
     const windVectorCheckbox = document.getElementById('wv');
     const awsCheckbox = document.getElementById('aws');
     const topoCheckbox = document.getElementById('topo');
     const lightningCheckbox = document.getElementById('lightning'); // Reference for the lightning checkbox
     const latInput = document.getElementById('lat-display');
     const lonInput = document.getElementById('lon-display');
     const radInput = document.getElementById('rad-display');
     const latDownButton = document.getElementById('down-button-lat');
     const latUpButton = document.getElementById('up-button-lat');
     const lonDownButton = document.getElementById('down-button-lon');
     const lonUpButton = document.getElementById('up-button-lon');
     const zoomOutButton = document.getElementById('zoom-out-button');
     const zoomInButton = document.getElementById('zoom-in-button');
     const zeroButton = document.getElementById('zero-button');
 
     const baseURL = "https://radar.kma.go.kr/cgi-bin/center/nph-rdr_cmp_img?cmp=HSP&color=C4&qcd=HSO&obs=ECHO&map=HB&size=800&gis=1&legend=1&gov=KMA";
-    let includeGcT = false; // Default state to include &gc=T
+    let errorReloadInterval = null; // Interval for retrying image load
+
+    image.addEventListener('error', () => {
+        if (!errorReloadInterval) {
+            errorReloadInterval = setInterval(() => {
+                location.reload();
+            }, 2000);
+        }
+    });
+
+    image.addEventListener('load', () => {
+        if (errorReloadInterval) {
+            clearInterval(errorReloadInterval);
+            errorReloadInterval = null;
+        }
+    });
 
     function updateBaseURL() {
         let newBaseURL = baseURL;
-        if (includeGcT) {
+        if (lightningCheckbox.checked) {
             newBaseURL += "&gc=T";
         }
         return newBaseURL;
     }
 
     const regionConfigs = {
         '전국/선택지점[4시간]': { url: "&lonlat=0&lat=35.90&lon=127.80&zoom=2&ht=1000", interval: 5, frames: 48 },
         '수도권[2시간]': { url: "&lonlat=0&lat=37.57&lon=126.97&zoom=4.9&ht=1000", interval: 5, frames: 24 },
         '충청권[2시간]': { url: "&lonlat=0&lat=36.49&lon=127.24&zoom=4.9&ht=1000", interval: 5, frames: 24 },
         '호남권[2시간]': { url: "&lonlat=0&lat=35.17&lon=126.89&zoom=4.9&ht=1000", interval: 5, frames: 24 },
         '경남권[2시간]': { url: "&lonlat=0&lat=35.22&lon=128.67&zoom=4.9&ht=1000", interval: 5, frames: 24 },
         '경북권[2시간]': { url: "&lonlat=0&lat=36.25&lon=128.56&zoom=4.9&ht=1000", interval: 5, frames: 24 },
         '강원권[2시간]': { url: "&lonlat=0&lat=37.78&lon=128.40&zoom=4.9&ht=1000", interval: 5, frames: 24 },
         '제주권[2시간]': { url: "&lonlat=0&lat=33.38&lon=126.53&zoom=4.9&ht=1000", interval: 5, frames: 24 },
         '동아시아[24시간]': { url: "&lonlat=0&lat=33.11&lon=126.27&zoom=0.5&ht=1000", interval: 30, frames: 48 }
     };
 
     let selectedRegionConfig = regionConfigs['전국/선택지점[4시간]'];
     let intervalId;
     let isPlaying = true; // Default to true for auto play
     let preloadedImages = [];
     let speed = parseInt(localStorage.getItem('speed')) || 500; // Default speed in milliseconds or saved value
     let imageTimes = [];
     let userPaused = false; // To track if the user has paused
 
diff --git a/scripts.js b/scripts.js
index b114273db9b0247c19236adfe3f702b9a053a52a..be458728d3b8c2918f89f1e952daa786a188c002 100644
--- a/scripts.js
+++ b/scripts.js
@@ -346,52 +361,51 @@ document.addEventListener('DOMContentLoaded', async function () {
         updateImages(true); // Force update on region change
         updateInputState(); // Update input state based on selection
     });
 
     centerCheckbox.addEventListener('change', function () {
         localStorage.setItem('center', centerCheckbox.checked ? '1' : '0');
         updateImages(true); // Force update on checkbox change
     });
 
     windVectorCheckbox.addEventListener('change', function () {
         localStorage.setItem('wv', windVectorCheckbox.checked ? '1' : '0');
         updateImages(true); // Force update on checkbox change
     });
 
     awsCheckbox.addEventListener('change', function () {
         localStorage.setItem('aws', awsCheckbox.checked ? '1' : '0');
         updateImages(true); // Force update on checkbox change
     });
 
     topoCheckbox.addEventListener('change', function () {
         localStorage.setItem('topo', topoCheckbox.checked ? '1' : '0');
         updateImages(true); // Force update on checkbox change
     });
 
     lightningCheckbox.addEventListener('change', function () {
-        includeGcT = lightningCheckbox.checked;
-        localStorage.setItem('lightning', includeGcT ? '1' : '0');
+        localStorage.setItem('lightning', lightningCheckbox.checked ? '1' : '0');
         updateImages(true); // Force update on checkbox change
     });
 
     function updateTimeDisplays() {
         const now = new Date();
         const formattedNow = formatDate(now, "display");
         nowDisplay.textContent = `현재: ${formattedNow}`;
     }
 
     function updateRefreshTime() {
         const now = new Date();
         const formattedNow = formatDate(now, "display");
         lastRefresh.textContent = `갱신: ${formattedNow}`;
     }
 
     // 도분초를 도 단위로 변환하는 함수
     function dmsToDecimal(dms) {
         const parts = dms.split(/[^\d\w]+/);
         const degrees = parseFloat(parts[0]);
         const minutes = parseFloat(parts[1]) / 60 || 0;
         const seconds = parseFloat(parts[2]) / 3600 || 0;
         return degrees + minutes + seconds;
     }
 
     // 확인 버튼 클릭 이벤트 핸들러
