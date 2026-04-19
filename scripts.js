window.APPID = '91c6b68f6fb026ad298152354c812c71';
window.APIURL = 'https://api.openweathermap.org/data/2.5';
window.ICONURL = 'https://openweathermap.org/img/wn';

// --- Tab Switching logic ---
document.getElementById('tabToday').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('tabFive').classList.remove('active');
    document.getElementById('todayContent').classList.add('active');
    document.getElementById('fiveDayContent').classList.remove('active');
    if (!document.getElementById('errorView').classList.contains('hidden')) {
        document.getElementById('weatherDataContainer').classList.add('hidden');
    }
});

document.getElementById('tabFive').addEventListener('click', function() {
    this.classList.add('active');
    document.getElementById('tabToday').classList.remove('active');
    document.getElementById('fiveDayContent').classList.add('active');
    document.getElementById('todayContent').classList.remove('active');
    
    if (window.forecastData) {
        render5DayForecast(window.forecastData);
    }
    else if (!document.getElementById('errorView').classList.contains('hidden')) {
        document.getElementById('fiveDayDataContainer').classList.add('hidden');
    }

});

// --- Load ---
window.onload = function() {
    getCurrentLocationWeather();

    const handleSearch = () => {
        let searchBox = document.querySelector('#searchBox');
        if (searchBox.value.trim()) {
            let url = `${window.APIURL}/weather?q=${encodeURIComponent(searchBox.value.trim())}&appid=${window.APPID}&units=metric`;
            updateAllWeather(url);
        }
    };
    document.querySelector('#searchButton').addEventListener('click', handleSearch);
    document.querySelector('#searchBox').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSearch();
    });
};
//get current location weather
function getCurrentLocationWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                let lat = position.coords.latitude;
                let lon = position.coords.longitude;
                let url = `${window.APIURL}/weather?lat=${lat}&lon=${lon}&appid=${window.APPID}&units=metric`;
                updateAllWeather(url);
            },
            function(error) {
                console.warn("Geolocation failed:", error.message);
                const defaultCity = document.querySelector('#locationName').textContent.trim();
                let url = `${window.APIURL}/weather?q=${defaultCity}&appid=${window.APPID}&units=metric`;
                updateAllWeather(url);
            }
        );
    } else {
        const defaultCity = document.querySelector('#locationName').textContent.trim() || 'Phnom Penh';
        let url = `${window.APIURL}/weather?q=${defaultCity}&appid=${window.APPID}&units=metric`;
        updateAllWeather(url);
    }
}
//update all weather
function updateAllWeather(url) {
    const searchInput = document.querySelector('#searchBox').value.trim();

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const errorView = document.getElementById('errorView');
            const todayData = document.getElementById('weatherDataContainer');
            const fiveDayData = document.getElementById('fiveDayDataContainer');
            const errorCityName = document.getElementById('errorCityName');

            if (data.cod === "404" || data.cod === 404) {
                if (todayData) todayData.classList.add('hidden');
                if (fiveDayData) fiveDayData.classList.add('hidden');
                
                errorView.classList.remove('hidden');
                errorCityName.textContent = searchInput || "Location";
                return;
            }

            errorView.classList.add('hidden');
            if (todayData) todayData.classList.remove('hidden');
            if (fiveDayData) fiveDayData.classList.remove('hidden');
            window.cityTimezoneOffset = data.timezone;
            displayCurrentWeather(data);
            getForecast(data.coord.lat, data.coord.lon);
            getNearbyWeather(data.coord.lat, data.coord.lon);
        })
        .catch(err => {
            console.error("Fetch error:", err);

        });
}
//display current weather
function displayCurrentWeather(data) {
    const locationName = document.querySelector('#locationName');
    const weatherIcon = document.querySelector('#weatherIcon');
    weatherIcon.style.opacity = '0'; 
    weatherIcon.classList.add('skeleton-icon'); 
    
    locationName.classList.remove('skeleton');
    locationName.textContent = data.name;

    let icon = data.weather[0].icon;
    weatherIcon.src = ICONURL + '/' + icon + '@2x.png';
    weatherIcon.onload = function() {
        weatherIcon.classList.remove('skeleton-icon');
        weatherIcon.style.transition = 'opacity 0.4s ease';
        weatherIcon.style.opacity = '1';
    };
    document.querySelector('#realFeel').textContent = Math.round(data.main.feels_like);
    document.querySelector('#temperature').innerHTML = Math.round(data.main.temp) + ' &#8451;';
    
    let sunrise = new Date(data.sys.sunrise * 1000);
    let sunset = new Date(data.sys.sunset * 1000);
    document.querySelector('#sunRise').textContent = sunrise.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    document.querySelector('#sunSet').textContent = sunset.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const cityTimeMs = utc + (data.timezone * 1000);
    const dateOptions = { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
    let diffMs = sunset - sunrise;
    let hours = Math.floor(diffMs / (1000 * 60 * 60));
    let minutes = Math.floor((diffMs / (1000 * 60)) % 60);
    document.getElementById('duration').textContent = hours + 'h ' + minutes + 'm';
    document.querySelector('#currentDate').textContent = new Date(cityTimeMs).toLocaleDateString('us-US', dateOptions); 
}

//render today hourly
function renderTodayHourly(list) {
    const timeline = document.getElementById('hourlyTimeline');
    if (!timeline) return;
    timeline.innerHTML = '';
    
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const timezoneOffset = window.cityTimezoneOffset || 0;
    const nowUtc = new Date().getTime() + (new Date().getTimezoneOffset() * 60000);
    const cityLocalTime = new Date(nowUtc + (timezoneOffset * 1000));
    const currentHour = cityLocalTime.getHours();

    for (let i = 0; i < 8; i++) {
        const forecastDate = new Date(cityLocalTime.getTime() + (i * 3600000));
        forecastDate.setHours(currentHour + i);
        forecastDate.setMinutes(0);

        const closestData = list.reduce((prev, curr) => {
            return (Math.abs(curr.dt * 1000 - forecastDate.getTime()) < Math.abs(prev.dt * 1000 - forecastDate.getTime()) ? curr : prev);
        });

        const timeLabel = (i === 0) ? '<span style="color: #383434;">Now</span>' : forecastDate.toLocaleTimeString([], { hour: 'numeric', hour12: true }).toLowerCase().replace(' ', '');

        let weatherDesc = closestData.weather[0].description;
        if (weatherDesc === 'clear sky') {
            weatherDesc = closestData.weather[0].icon.includes('d') ? 'Sunny' : 'Clear';
        } else if (weatherDesc.includes('rain')) {
            weatherDesc = 'Rainy';
        } else if (weatherDesc.includes('cloud')) {
            weatherDesc = 'Cloudy';
        } else {
            weatherDesc = weatherDesc.charAt(0).toUpperCase() + weatherDesc.slice(1);
        }

        const windDir = directions[Math.round(closestData.wind.deg / 45) % 8];
        const column = document.createElement('div');
        column.className = 'hourly-column';
        column.innerHTML = `
            <div class="hourly-header-group">
                <div class="time-text" style="${i === 0 ? 'font-weight: bold; color: white;' : ''}">${timeLabel}</div>
                <div class="icon-box"><img src="${window.ICONURL}/${closestData.weather[0].icon}.png"></div>
            </div>
            <div class="hourly-data desc">${weatherDesc}</div>
            <div class="hourly-data temp">${Math.round(closestData.main.temp)}°</div>
            <div class="hourly-data feel">${Math.round(closestData.main.feels_like)}°</div>
            <div class="hourly-data wind">${Math.round(closestData.wind.speed * 3.6)} km/h ${windDir}</div>
        `;
        timeline.appendChild(column);
    }
}

//get nearby weather
function getNearbyWeather(lat, lon) {
    const findUrl = `${APIURL}/find?lat=${lat}&lon=${lon}&cnt=10&units=metric&appid=${APPID}`;

    fetch(findUrl)
        .then(response => response.json())
        .then(data => {
            const nearbyGrid = document.getElementById("nearbyGrid");
            if (!nearbyGrid || !data.list) return;

            nearbyGrid.innerHTML = "";

            const currentCityName = document.querySelector('#locationName')?.textContent || "";

            const uniqueCities = [];
            const seenNames = new Set();
            seenNames.add(currentCityName);

            data.list.forEach(city => {
                if (!seenNames.has(city.name) && uniqueCities.length < 4) {
                    uniqueCities.push(city);
                    seenNames.add(city.name);
                }
            });

            uniqueCities.forEach(city => {
                nearbyGrid.innerHTML += `
                    <div class="place-item">
                        <span class="place-name">${city.name}</span>
                        <div class="place-weather">
                            <img src="${window.ICONURL}/${city.weather[0].icon}.png">
                            <span class="place-temp">${Math.round(city.main.temp)}°C</span>
                        </div>
                    </div>`;
            });
        });
}
//get forecast
function getForecast(lat, lon) {
    let url = APIURL + '/forecast?lat=' + lat + '&lon=' + lon + '&appid=' + APPID + '&units=metric';
    fetch(url)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            window.forecastData = data.list; 
            renderTodayHourly(data.list);
            if (document.getElementById('fiveDayContent').classList.contains('active')) {
                render5DayForecast(data.list);
            }
        });
}
//render 5 day forecast
function render5DayForecast(list) {
    const cardsContainer = document.getElementById('fiveDayCards');
    if (!cardsContainer) return;
    cardsContainer.innerHTML = '';

    const daysMap = {};
    list.forEach(function(item) {
        const date = item.dt_txt.split(' ')[0];
        if (!daysMap[date]) daysMap[date] = [];
        daysMap[date].push(item);
    });

    const dateKeys = Object.keys(daysMap).slice(0, 7);
    dateKeys.forEach(function(date, index) {
        const dayItems = daysMap[date];
        const dayMain = dayItems[0];
        const dateObj = new Date(dayMain.dt * 1000);
        const card = document.createElement('div');
        card.className = 'day-card' + (index === 0 ? ' active' : '');
        let weatherDesc = dayMain.weather[0].description;
        if (weatherDesc === 'clear sky') {
            weatherDesc = dayMain.weather[0].icon.includes('d') ? 'Sunny' : 'Clear';
        } else if (weatherDesc.includes('rain')) {
            weatherDesc = 'Rainy';
        } else if (weatherDesc.includes('cloud')) {
            weatherDesc = 'Cloudy';
        }
        else {
            weatherDesc = weatherDesc.charAt(0).toUpperCase() + weatherDesc.slice(1);
        }
    
        card.innerHTML = `
            <div class="card-day">${dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</div>
            <div class="card-date">${dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase()}</div>
            <img src="${window.ICONURL}/${dayMain.weather[0].icon}.png">
            <div class="card-temp">${Math.round(dayMain.main.temp)}°C</div>
            <div class="card-desc">${weatherDesc}</div>
        `;

        card.addEventListener('click', function() {
            document.querySelectorAll('.day-card').forEach(function(c) { c.classList.remove('active'); });
            card.classList.add('active');
            document.getElementById('selectedDayLabel').textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
            renderSpecificDayHourly(dayItems);
        });
        cardsContainer.appendChild(card);
    });

    renderSpecificDayHourly(daysMap[dateKeys[0]]);
    document.getElementById('selectedDayLabel').textContent = new Date(daysMap[dateKeys[0]][0].dt * 1000).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
}

//render specific day hourly
function renderSpecificDayHourly(dayItems) {
    const timeline = document.getElementById('fiveDayHourlyTimeline');
    if (!timeline) return;
    timeline.innerHTML = '';
    
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const timezoneOffset = window.cityTimezoneOffset || 0;

    const nowUtc = new Date().getTime() + (new Date().getTimezoneOffset() * 60000);
    const cityLocalTime = new Date(nowUtc + (timezoneOffset * 1000));
    
    const clickedDateStr = new Date(dayItems[0].dt * 1000).toDateString();
    const isCityToday = clickedDateStr === cityLocalTime.toDateString();

    let startHour = isCityToday ? cityLocalTime.getHours() : 0;

    for (let i = 0; i < 8; i++) {
        const targetDate = new Date(dayItems[0].dt * 1000);
        targetDate.setHours(startHour + i);
        targetDate.setMinutes(0);

        const closestData = dayItems.reduce((prev, curr) => {
            return (Math.abs(curr.dt * 1000 - targetDate.getTime()) < Math.abs(prev.dt * 1000 - targetDate.getTime()) ? curr : prev);
        });

        let timeLabel = (isCityToday && i === 0) ? '<span style="color: #383434;">Now</span>' : targetDate.toLocaleTimeString([], { hour: 'numeric', hour12: true }).toLowerCase().replace(' ', '');

        let weatherDesc = closestData.weather[0].description;
        if (weatherDesc === 'clear sky') {
            weatherDesc = closestData.weather[0].icon.includes('d') ? 'Sunny' : 'Clear';
        } else if (weatherDesc.includes('rain')) {
            weatherDesc = 'Rainy';
        } else if (weatherDesc.includes('cloud')) {
            weatherDesc = 'Cloudy';
        } else {
            weatherDesc = weatherDesc.charAt(0).toUpperCase() + weatherDesc.slice(1);
        }

        const windDir = directions[Math.round(closestData.wind.deg / 45) % 8];
        const col = document.createElement('div');
        col.className = 'hourly-column';
        col.innerHTML = `
            <div class="hourly-header-group">
                <div class="time-text" style="${(isCityToday && i === 0) ? 'font-weight: bold; color: white;' : ''}">${timeLabel}</div>
                <div class="icon-box"><img src="${window.ICONURL}/${closestData.weather[0].icon}.png"></div>
            </div>
            <div class="hourly-data desc">${weatherDesc}</div>
            <div class="hourly-data temp">${Math.round(closestData.main.temp)}°</div>
            <div class="hourly-data feel">${Math.round(closestData.main.feels_like)}°</div>
            <div class="hourly-data wind">${Math.round(closestData.wind.speed * 3.6)} km/h ${windDir}</div>
        `;
        timeline.appendChild(col);
    }
}
