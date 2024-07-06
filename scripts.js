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

    const baseURL = "https://radar.kma.go.kr/cgi-bin/center/nph-rdr_cmp_img?cmp=HSP&color=C4&qcd=HSO&obs=ECHO&map=HB&size=800&gis=1&legend=1&gov=KMA&gc=T&gc_itv=60";
    const regionConfigs = {
        '전국[4시간]': { url: "&lonlat=0&lat=35.90&lon=127.80&zoom=2&ht=1000", interval: 5, frames: 48 },
        '수도권[2시간]': { url: "&lonlat=0&lat=37.57&lon=126.97&zoom=4.9&ht=1000", interval: 5, frames: 24 },
        '충청권[2시간]': { url: "&lonlat=0&lat=36.49&lon=127.24&zoom=4.9&ht=1000", interval: 5, frames: 24 },
        '호남권[2시간]': { url: "&lonlat=0&lat=35.17&lon=126.89&zoom=4.9&ht=1000", interval: 5, frames: 24 },
        '경남권[2시간]': { url: "&lonlat=0&lat=35.22&lon=128.67&zoom=4.9&ht=1000", interval: 5, frames: 24 },
        '경북권[2시간]': { url: "&lonlat=0&lat=36.25&lon=128.56&zoom=4.9&ht=1000", interval: 5, frames: 24 },
        '강원권[2시간]': { url: "&lonlat=0&lat=37.78&lon=128.40&zoom=4.9&ht=1000", interval: 5, frames: 24 },
        '제주권[2시간]': { url: "&lonlat=0&lat=33.38&lon=126.53&zoom=4.9&ht=1000", interval: 5, frames: 24 },
        '동아시아[24시간]': { url: "&lonlat=0&lat=33.11&lon=126.27&zoom=0.5&ht=1000", interval: 30, frames: 48 }
    };

    let selectedRegionConfig = regionConfigs['전국[4시간]'];
    let intervalId;
    let isPlaying = true;
    let preloadedImages = [];
    let speed = parseInt(localStorage.getItem('speed')) || 500; // Default speed in milliseconds or saved value
    let imageTimes = [];

    // Load selected region, center state, wind vector state, aws state, and topo state from localStorage
    const savedRegion = localStorage.getItem('region-select');
    const savedCenter = localStorage.getItem('center') === '1';
    const savedWindVector = localStorage.getItem('wv') === '1';
    const savedAws = localStorage.getItem('aws') === '1';
    const savedTopo = localStorage.getItem('topo') === '1';

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

        nowKST.setMinutes(Math.floor(nowKST.getMinutes() / interval) * interval);
        nowKST.setSeconds(0);
        nowKST.setMilliseconds(0);

        imageTimes = [];

        for (let i = 0; i < selectedRegionConfig.frames; i++) {
            const date = new Date(nowKST.getTime() - i * interval * 60000);
            const formattedDate = formatDate(date);
            urls.push(`${baseURL}&center=${center}&wv=${windVector}&aws=${aws}&topo=${topo}${selectedRegionConfig.url}&tm=${formattedDate}`);
            imageTimes.push(date);
        }
        return urls.reverse();
    }

    async function updateImages() {
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

        // Set up the automatic slide show
        startAutoPlay();
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
        } else {
            startAutoPlay();
            playPauseButton.textContent = '정지';
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

    regionSelect.addEventListener('change', function () {
        selectedRegionConfig = regionConfigs[regionSelect.value];
        localStorage.setItem('region-select', regionSelect.value); // Save selected region to localStorage
        updateImages();
    });

    centerCheckbox.addEventListener('change', function () {
        localStorage.setItem('center', centerCheckbox.checked ? '1' : '0');
        updateImages();
    });

    windVectorCheckbox.addEventListener('change', function () {
        localStorage.setItem('wv', windVectorCheckbox.checked ? '1' : '0');
        updateImages();
    });

    awsCheckbox.addEventListener('change', function () {
        localStorage.setItem('aws', awsCheckbox.checked ? '1' : '0');
        updateImages();
    });

    topoCheckbox.addEventListener('change', function () {
        localStorage.setItem('topo', topoCheckbox.checked ? '1' : '0');
        updateImages();
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

    // Initial load
    await updateImages();
    updateTimeDisplays();
    updateRefreshTime();

    // Display the correct speed on page load
    speedDisplay.textContent = `${(speed / 1000).toFixed(1)} s/frame`;

    // Auto refresh every 5 minutes (300,000 milliseconds)
    setInterval(() => {
        location.reload();
    }, 300000);

    // Update now time every second
    setInterval(updateTimeDisplays, 1000);
});
