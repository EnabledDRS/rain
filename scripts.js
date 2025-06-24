document.addEventListener('DOMContentLoaded', async function () {
    const regionSelect = document.querySelector('.region-select');
    const image = document.getElementById('radar-image');
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
    let includeGcT = false; // Default state to include &gc=T

    function updateBaseURL() {
        let newBaseURL = baseURL;
        if (includeGcT) {
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

    // Load selected region, center state, wind vector state, aws state, topo state, and lightning state from localStorage
    const savedRegion = localStorage.getItem('region-select');
    const savedCenter = localStorage.getItem('center') === '1';
    const savedWindVector = localStorage.getItem('wv') === '1';
    const savedAws = localStorage.getItem('aws') === '1';
    const savedTopo = localStorage.getItem('topo') === '1';
    const savedLightning = localStorage.getItem('lightning') === '1';

    if (savedRegion) {
        selectedRegionConfig = regionConfigs[savedRegion];
        regionSelect.value = savedRegion;
    }

    if (savedCenter) {
        centerCheckbox.checked = true;
    }

    if (savedWindVector) {
        windVectorCheckbox.checked = true;
    }

    if (savedAws) {
        awsCheckbox.checked = true;
    }

    if (savedTopo) {
        topoCheckbox.checked = true;
    }

    if (savedLightning) {
        lightningCheckbox.checked = true;
    }

    // Get URL parameters for latitude, longitude, and zoom from localStorage
    let latParam = localStorage.getItem('lat');
    let lonParam = localStorage.getItem('lon');
    let radParam = localStorage.getItem('rad');

    async function getInternetTime() {
        const response = await fetch('https://worldtimeapi.org/api/timezone/Asia/Seoul');
        const data = await response.json();
        return new Date(data.datetime);
    }

    function formatDate(date, type = "url") {
        const y = date.getFullYear();
        const m = ('0' + (date.getMonth() + 1)).slice(-2);
        const d = ('0' + date.getDate()).slice(-2);
        const h = ('0' + date.getHours()).slice(-2);
        const min = ('0' + date.getMinutes()).slice(-2);
        const s = ('0' + date.getSeconds()).slice(-2);

        if (type === "url") {
            return `${y}${m}${d}${h}${min}${s}`;
        } else if (type === "display") {
            return `${y}.${m}.${d} ${h}:${min}:${s}`;
        } else if (type === "image") {
            return `${y}. ${m}. ${d}.  ${h}:${min}`;
        }
    }

    async function generateImageURLs() {
        const urls = [];
        const nowKST = await getInternetTime();
        const interval = selectedRegionConfig.interval;
        const center = centerCheckbox.checked ? 1 : 0;
        const windVector = windVectorCheckbox.checked ? 1 : 0;
        const aws = awsCheckbox.checked ? 1 : 0;
        const topo = topoCheckbox.checked ? 1 : 0;
        const lightning = lightningCheckbox.checked ? 1 : 0;

        nowKST.setMinutes(Math.floor(nowKST.getMinutes() / interval) * interval);
        nowKST.setSeconds(0);
        nowKST.setMilliseconds(0);

        imageTimes = [];

        for (let i = 0; i < selectedRegionConfig.frames; i++) {
            const date = new Date(nowKST.getTime() - i * interval * 60000);
            const formattedDate = formatDate(date);

            // Append latitude, longitude, and zoom parameters to the URL if they exist
            const dynamicLat = latParam ? `&lat=${latParam}` : '';
            const dynamicLon = lonParam ? `&lon=${lonParam}` : '';
            const dynamicRad = radParam ? `&zoom=${(574 * Math.pow(radParam, -1.001)).toFixed(2)}` : '';
            const dynamicParams = `${dynamicLat}${dynamicLon}${dynamicRad}`;

            urls.push(`${updateBaseURL()}&center=${center}&wv=${windVector}&aws=${aws}&topo=${topo}&lightning=${lightning}${selectedRegionConfig.url}${dynamicParams}&tm=${formattedDate}`);
            imageTimes.push(date);
        }
        return urls.reverse();
    }

    async function updateImages(forceUpdate = false) {
        const center = centerCheckbox.checked ? 1 : 0;
        const windVector = windVectorCheckbox.checked ? 1 : 0;
        const aws = awsCheckbox.checked ? 1 : 0;
        const topo = topoCheckbox.checked ? 1 : 0;
        const lightning = lightningCheckbox.checked ? 1 : 0;

        if (!forceUpdate && lastUpdateRegion === regionSelect.value &&
            lastUpdateCenter === center && lastUpdateWindVector === windVector &&
            lastUpdateAws === aws && lastUpdateTopo === topo && lastUpdateLightning === lightning) {
            return;
        }

        const images = await generateImageURLs();
        preloadedImages = images.map((url, index) => {
            const img = new Image();
            img.src = url;
            return { img, time: imageTimes[imageTimes.length - 1 - index] };
        });

        // Update the image source and time display based on slider value
        slider.max = selectedRegionConfig.frames - 1;
        slider.addEventListener('input', function () {
            const index = slider.value;
            image.src = preloadedImages[index].img.src;
            timeDisplay.textContent = formatDate(preloadedImages[index].time, "image");
        });

        // Initialize the first image and time display
        image.src = preloadedImages[0].img.src;
        image.style.width = "100%"; // Ensure image width fits the screen
        timeDisplay.textContent = formatDate(preloadedImages[0].time, "image");

        // Set up the automatic slide show if playing
        if (isPlaying) {
            startAutoPlay();
        }

        lastUpdateRegion = regionSelect.value;
        lastUpdateCenter = center;
        lastUpdateWindVector = windVector;
        lastUpdateAws = aws;
        lastUpdateTopo = topo;
        lastUpdateLightning = lightning;
    }

    function startAutoPlay() {
        clearInterval(intervalId);
        intervalId = setInterval(() => {
            slider.value = (parseInt(slider.value) + 1) % selectedRegionConfig.frames;
            const index = slider.value;
            image.src = preloadedImages[index].img.src;
            timeDisplay.textContent = formatDate(preloadedImages[index].time, "image");
        }, speed);
    }

    playPauseButton.addEventListener('click', function () {
        if (isPlaying) {
            clearInterval(intervalId);
            playPauseButton.textContent = '재생';
            userPaused = true;
        } else {
            startAutoPlay();
            playPauseButton.textContent = '정지';
            userPaused = false;
        }
        isPlaying = !isPlaying;
    });

    fasterButton.addEventListener('click', function () {
        if (speed > 100) {
            speed -= 100;
            speedDisplay.textContent = `${(speed / 1000).toFixed(1)} s/frame`;
            localStorage.setItem('speed', speed); // Save speed to localStorage
            if (isPlaying) {
                clearInterval(intervalId);
                startAutoPlay();
            }
        }
    });

    slowerButton.addEventListener('click', function () {
        if (speed < 2000) {
            speed += 100;
            speedDisplay.textContent = `${(speed / 1000).toFixed(1)} s/frame`;
            localStorage.setItem('speed', speed); // Save speed to localStorage
            if (isPlaying) {
                clearInterval(intervalId);
                startAutoPlay();
            }
        }
    });

    function updateInputState() {
        const isDisabled = regionSelect.value !== '전국/선택지점[4시간]';
        latInput.disabled = isDisabled;
        lonInput.disabled = isDisabled;
        radInput.disabled = isDisabled;

        if (isDisabled) {
            latInput.placeholder = "전국/선택지점";
            lonInput.placeholder = "에서 좌표 지정";
            radInput.placeholder = "";
        } else {
            latInput.placeholder = "위도(32°~44°)";
            lonInput.placeholder = "경도(123°~131°)";
            radInput.placeholder = "반경(km)";
        }

        // Update the border of the zeroButton based on input values
        if (latInput.value || lonInput.value || radInput.value) {
            zeroButton.classList.add('highlight');
        } else {
            zeroButton.classList.remove('highlight');
        }
    }

    function modifyValue(inputElement, increment) {
        if (!inputElement.disabled) {
            let currentValue = parseFloat(inputElement.value) || 0;
            currentValue += increment;
            inputElement.value = currentValue.toFixed(2);
            saveLatLonZoom(); // Save updated values to localStorage
        }
    }

    function modifyZoomValue(inputElement, increment) {
        if (!inputElement.disabled) {
            let currentValue = parseFloat(inputElement.value) || 0;
            currentValue += increment;
            inputElement.value = currentValue.toFixed(0); // 10 단위로 증가/감소
            saveLatLonZoom(); // Save updated values to localStorage
        }
    }

    function setupButtonHold(button, inputElement, increment, modifyFunc) {
        let intervalId;
        button.addEventListener('mousedown', function () {
            modifyFunc(inputElement, increment);
            intervalId = setInterval(function () {
                modifyFunc(inputElement, increment);
            }, 100); // 100ms마다 값 변경
        });
        button.addEventListener('mouseup', function () {
            clearInterval(intervalId);
        });
        button.addEventListener('mouseleave', function () {
            clearInterval(intervalId);
        });
    }

    setupButtonHold(latDownButton, latInput, -0.01, modifyValue);
    setupButtonHold(latUpButton, latInput, 0.01, modifyValue);
    setupButtonHold(lonDownButton, lonInput, -0.01, modifyValue);
    setupButtonHold(lonUpButton, lonInput, 0.01, modifyValue);
    setupButtonHold(zoomOutButton, radInput, -10, modifyZoomValue);
    setupButtonHold(zoomInButton, radInput, 10, modifyZoomValue);

    // Function to save latitude, longitude, and zoom to localStorage
    function saveLatLonZoom() {
        const lat = document.getElementById('lat-display').value;
        const lon = document.getElementById('lon-display').value;
        const rad = document.getElementById('rad-display').value;
        localStorage.setItem('lat', lat);
        localStorage.setItem('lon', lon);
        localStorage.setItem('rad', rad);
        latParam = lat;
        lonParam = lon;
        radParam = rad;
    }

    // Function to retrieve latitude, longitude, and zoom from localStorage
    function loadLatLonZoom() {
        const lat = localStorage.getItem('lat');
        const lon = localStorage.getItem('lon');
        const rad = localStorage.getItem('rad');
        if (lat) document.getElementById('lat-display').value = lat;
        if (lon) document.getElementById('lon-display').value = lon;
        if (rad) document.getElementById('rad-display').value = rad;
    }

    // Load latitude, longitude, and zoom values from localStorage on page load
    loadLatLonZoom();

    regionSelect.addEventListener('change', function () {
        selectedRegionConfig = regionConfigs[regionSelect.value];
        localStorage.setItem('region-select', regionSelect.value); // Save selected region to localStorage
        // Clear manual lat, lon, zoom settings to give priority to dropdown selection
        localStorage.removeItem('lat');
        localStorage.removeItem('lon');
        localStorage.removeItem('rad');
        latParam = null;
        lonParam = null;
        radParam = null;
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
        includeGcT = lightningCheckbox.checked;
        localStorage.setItem('lightning', includeGcT ? '1' : '0');
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
    document.getElementById('ok-button').addEventListener('click', function () {
        if (regionSelect.value !== '전국/선택지점[4시간]') {
            alert('전국/선택지점[4시간] 옵션에서만 좌표를 설정할 수 있습니다.');
            return;
        }

        const latInput = document.getElementById('lat-display').value;
        const lonInput = document.getElementById('lon-display').value;
        const radInputValue = document.getElementById('rad-display').value;

        latInput.value = 35.90;
        lonInput.value = 127.80;

        let lat = latInput;
        let lon = lonInput;

        if (latInput.includes('°') || latInput.includes("'") || latInput.includes('"')) {
            lat = dmsToDecimal(latInput);
        }
        if (lonInput.includes('°') || lonInput.includes("'") || lonInput.includes('"')) {
            lon = dmsToDecimal(lonInput);
        }

        radInputValue.value = 100;
        
        let validLat = lat >= 32 && lat <= 44;
        let validLon = lon >= 123 && lon <= 131;
        let validRad = radInputValue === '' || radInputValue > 0;

        let errorMessage = '유효하지 않은 ';
        let invalidFields = [];

        if (!validLat) {
            invalidFields.push('위도');
        }
        if (!validLon) {
            invalidFields.push('경도');
        }
        if (!validRad) {
            invalidFields.push('반경');
        }

        if (invalidFields.length > 0) {
            errorMessage += invalidFields.join(', ') + ' 값입니다.';
            alert(errorMessage);
        } else {
            let currentZoom = selectedRegionConfig.url.match(/&zoom=([0-9.]+)/)[1];
            let zoom = radInputValue === '' ? currentZoom : (574 * Math.pow(radInputValue, 1.001)).toFixed(2);
            regionConfigs['전국/선택지점[4시간]'].url = `&lonlat=0&lat=${lat}&lon=${lon}&zoom=${zoom}&ht=1000`;
            localStorage.setItem('region-select', '전국/선택지점[4시간]');
            saveLatLonZoom(); // Save the new values
            updateImages(true); // Force update on manual input
        }
        updateInputState(); // Update input state after setting values
    });

    // 기본값 버튼 클릭 이벤트 핸들러
    document.getElementById('zero-button').addEventListener('click', function () {
        // 기본값을 전국/선택지점[4시간]으로 설정하고 interval과 frames 수정
        selectedRegionConfig = { url: "&lonlat=0&lat=35.90&lon=127.80&zoom=2&ht=1000", interval: 5, frames: 24 };
        localStorage.setItem('region-select', '전국/선택지점[4시간]');
        regionSelect.value = '전국/선택지점[4시간]';  // 드롭다운 메뉴도 기본값으로 설정
        localStorage.removeItem('lat');
        localStorage.removeItem('lon');
        localStorage.removeItem('rad');
        updateImages(true); // Force update on default selection
        if (!isPlaying) {
            startAutoPlay();
            playPauseButton.textContent = '정지';
            isPlaying = true;
        }
        location.reload(); // Refresh the page
    });

    // Initial load
    updateInputState(); // Set initial input state
    await updateImages(true); // Force initial update
    updateTimeDisplays();
    updateRefreshTime();

    // Display the correct speed on page load
    speedDisplay.textContent = `${(speed / 1000).toFixed(1)} s/frame`;

    // Auto refresh every 5 minutes (300,000 milliseconds) if not paused by user
    setInterval(() => {
        if (!userPaused) {
            location.reload();
        }
    }, 300000); // Set back to 300000 milliseconds (5 minutes)

    // Update now time every second
    setInterval(updateTimeDisplays, 1000);
});
