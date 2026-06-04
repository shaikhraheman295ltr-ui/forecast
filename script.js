const API_KEY = "c53ecaf30f964b6e82e180001261101";
const BASE = "https://api.weatherapi.com/v1/forecast.json";

const $ = id => document.getElementById(id);
const cityInput = $("cityInput");
const searchBtn = $("searchBtn");
const geoBtn = $("geoBtn");
const themeToggle = $("themeToggle");
const skeleton = $("skeleton");
const toast = $("toast");

let chart = null;
let toastTimer = null;
let lastData = null;
let worldMap = null;
let mapMarkers = [];

// CLOCK
function updateClock() {
  const d = new Date();
  $("clock").textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
updateClock();
setInterval(updateClock, 10000);

// THEME TOGGLE
const savedTheme = localStorage.getItem("theme");
if (savedTheme) document.body.className = savedTheme;

themeToggle.onclick = () => {
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.className);
  if (lastData) updateChart(lastData);
};

// SEARCH
searchBtn.onclick = () => {
  const q = cityInput.value.trim();
  if (q) fetchWeather(q);
};

cityInput.addEventListener("keydown", e => {
  if (e.key === "Enter") searchBtn.click();
});

// GEO
geoBtn.onclick = () => {
  if (!navigator.geolocation) {
    showToast("Geolocation not supported", true);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => fetchWeather(`${pos.coords.latitude},${pos.coords.longitude}`),
    () => showToast("Location access denied", true)
  );
};

// TOAST
function showToast(msg, isError = false) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = "toast" + (isError ? " error" : "");
  requestAnimationFrame(() => toast.classList.add("show"));
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

// LOADING
function setLoading(v) {
  skeleton.style.display = v ? "flex" : "none";
  document.querySelectorAll(".section:not(.skeleton):not(.map-section)").forEach(el => {
    el.style.display = v ? "none" : "";
  });
}

// MAIN FETCH
async function fetchWeather(query) {
  setLoading(true);
  try {
    const res = await fetch(`${BASE}?key=${API_KEY}&q=${query}&days=4&aqi=no&alerts=no`);
    if (!res.ok) throw new Error(res.status === 400 ? "City not found" : "Request failed");
    const data = await res.json();
    renderAll(data);
  } catch (err) {
    showToast(err.message, true);
    setLoading(false);
  }
}

// RENDER
function renderAll(data) {
  lastData = data;
  updateCurrent(data);
  updateChart(data);
  updateForecast(data);
  setLoading(false);
  if (worldMap) setTimeout(() => worldMap.invalidateSize(), 150);
}

function updateCurrent(data) {
  const c = data.current;
  const loc = data.location;

  $("location").textContent = `${loc.name}, ${loc.country}`;
  $("temp").textContent = Math.round(c.temp_c);
  $("condition").textContent = c.condition.text;
  $("feelsLike").textContent = `Feels like ${Math.round(c.feelslike_c)}°C`;
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  const windDir = dirs[Math.round(c.wind_degree / 22.5) % 16];
  $("wind").textContent = `${c.wind_kph} km/h ${windDir}`;
  $("humidity").textContent = `${c.humidity}%`;
  $("uv").textContent = c.uv;
  $("pressure").textContent = `${c.pressure_mb} mb`;
  $("visibility").textContent = `${c.vis_km} km`;
  $("rain").textContent = `${c.precip_mm} mm`;

  // Astro
  const astro = data.forecast.forecastday[0].astro;
  if (astro) {
    $("sunrise").textContent = astro.sunrise;
    $("sunset").textContent = astro.sunset;
  }
}

function updateChart(data) {
  const hours = data.forecast.forecastday[0].hour;
  const labels = hours.map(h => h.time.split(" ")[1]);
  const temps = hours.map(h => h.temp_c);
  const feels = hours.map(h => h.feelslike_c);
  const rain = hours.map(h => h.precip_mm);

  const light = document.body.classList.contains("light");
  const textColor = light ? "#555" : "#999";
  const gridColor = light ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)";
  const lineColor = light ? "#222" : "#f0f0f0";
  const feelsColor = light ? "#888" : "#666";
  const barColor = light ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.12)";

  if (chart) chart.destroy();

  chart = new Chart($("hourlyChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Temp °C",
          data: temps,
          borderColor: lineColor,
          backgroundColor: ctx => {
            if (!ctx.chart.chartArea) return "transparent";
            const { top, bottom } = ctx.chart.chartArea;
            const g = ctx.chart.ctx.createLinearGradient(0, top, 0, bottom);
            g.addColorStop(0, light ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)");
            g.addColorStop(1, "transparent");
            return g;
          },
          fill: true,
          order: 1,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: lineColor,
          borderWidth: 2,
        },
        {
          label: "Feels like °C",
          data: feels,
          borderColor: feelsColor,
          borderDash: [4, 4],
          borderWidth: 1.5,
          order: 1,
          fill: false,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          label: "Rain mm",
          data: rain,
          type: "bar",
          backgroundColor: barColor,
          borderRadius: 2,
          barPercentage: 0.5,
          order: 0,
          yAxisID: "yRain",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.8,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: light ? "#fff" : "#1c1c1c",
          titleColor: light ? "#111" : "#f0f0f0",
          bodyColor: light ? "#555" : "#ccc",
          borderColor: light ? "#d4d4d4" : "#2a2a2a",
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          displayColors: true,
          boxPadding: 4,
        },
      },
      scales: {
        x: {
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: textColor, maxRotation: 0, font: { size: 10 } },
        },
        y: {
          position: "left",
          grid: { color: gridColor, drawBorder: false },
          ticks: { color: textColor, font: { size: 10 } },
          title: { display: false },
        },
        yRain: {
          position: "right",
          grid: { display: false },
          ticks: { color: textColor, font: { size: 9 }, maxTicksLimit: 4 },
          title: { display: false },
        },
      },
      animations: {
        tension: {
          duration: 800,
          easing: "easeOutQuad",
        },
      },
    },
  });
}

function updateForecast(data) {
  const grid = $("forecastGrid");
  grid.innerHTML = "";

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  data.forecast.forecastday.forEach((day, i) => {
    const date = new Date(day.date);
    const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : days[date.getDay()];

    const div = document.createElement("div");
    div.className = "forecast-item";
    div.style.animationDelay = `${i * 0.1}s`;

    div.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <div class="forecast-icon">${getIcon(day.day.condition.code)}</div>
      <div class="forecast-temps">
        <span class="forecast-high">${Math.round(day.day.maxtemp_c)}°</span>
        <span class="forecast-low">${Math.round(day.day.mintemp_c)}°</span>
      </div>
      <div class="forecast-rain">${day.day.daily_chance_of_rain}% rain</div>
    `;

    grid.appendChild(div);
  });
}

function getIcon(code) {
  if (code === 1000) return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
  if (code >= 1003 && code <= 1009) return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 14a5 5 0 1 1 6.5-5.5A4 4 0 1 1 15 16H7a3 3 0 0 1-1-5.8"/></svg>`;
  if ((code >= 1030 && code <= 1035) || (code >= 1135 && code <= 1147)) return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 15h20M4 12h16M6 9h12"/></svg>`;
  if ((code >= 1063 && code <= 1087) || (code >= 1150 && code <= 1201) || (code >= 1240 && code <= 1246)) return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 13a4 4 0 0 0-8 0M12 13v7"/><path d="M12 13l-2 2M12 13l2 2"/></svg>`;
  if ((code >= 1204 && code <= 1237) || (code >= 1249 && code <= 1264)) return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 13a4 4 0 0 0-8 0"/><path d="M12 13v5"/><path d="M10 16l2-2 2 2"/></svg>`;
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 14a5 5 0 1 1 6.5-5.5A4 4 0 1 1 15 16H7a3 3 0 0 1-1-5.8"/></svg>`;
}

// ---------------- WORLD MAP ----------------
const WORLD_CITIES = [
  { name: "London", lat: 51.51, lon: -0.13, country: "UK" },
  { name: "New York", lat: 40.71, lon: -74.01, country: "USA" },
  { name: "Tokyo", lat: 35.68, lon: 139.69, country: "Japan" },
  { name: "Sydney", lat: -33.87, lon: 151.21, country: "Australia" },
  { name: "Moscow", lat: 55.76, lon: 37.62, country: "Russia" },
  { name: "Dubai", lat: 25.20, lon: 55.27, country: "UAE" },
  { name: "Singapore", lat: 1.35, lon: 103.82, country: "Singapore" },
  { name: "Cairo", lat: 30.04, lon: 31.24, country: "Egypt" },
  { name: "Sao Paulo", lat: -23.55, lon: -46.63, country: "Brazil" },
  { name: "Mumbai", lat: 19.08, lon: 72.88, country: "India" },
  { name: "Beijing", lat: 39.91, lon: 116.40, country: "China" },
  { name: "Cape Town", lat: -33.93, lon: 18.42, country: "South Africa" },
  { name: "Reykjavik", lat: 64.15, lon: -21.82, country: "Iceland" },
  { name: "Buenos Aires", lat: -34.61, lon: -58.38, country: "Argentina" },
  { name: "Los Angeles", lat: 34.05, lon: -118.24, country: "USA" },
  { name: "Paris", lat: 48.86, lon: 2.35, country: "France" },
  { name: "Berlin", lat: 52.52, lon: 13.41, country: "Germany" },
  { name: "Delhi", lat: 28.61, lon: 77.23, country: "India" },
  { name: "Shanghai", lat: 31.23, lon: 121.47, country: "China" },
  { name: "Lagos", lat: 6.52, lon: 3.38, country: "Nigeria" },
  { name: "Mexico City", lat: 19.43, lon: -99.13, country: "Mexico" },
  { name: "Jakarta", lat: -6.21, lon: 106.85, country: "Indonesia" },
];

function tempColor(temp) {
  if (temp < -10) return "#0a0aff";
  if (temp < 0) return "#3a7aff";
  if (temp < 10) return "#7abaff";
  if (temp < 20) return "#ffcc66";
  if (temp < 30) return "#ff8833";
  if (temp < 40) return "#ff3333";
  return "#cc0033";
}

function wmoIcon(code) {
  if (code === 0) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/></svg>`;
  if (code <= 3) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 14a5 5 0 1 1 6.5-5.5A4 4 0 1 1 15 16H7a3 3 0 0 1-1-5.8"/></svg>`;
  if (code >= 61 && code <= 82) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 13a4 4 0 0 0-8 0M12 13v7"/><path d="M12 13l-2 2M12 13l2 2"/></svg>`;
  if (code >= 71 && code <= 77) return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 13a4 4 0 0 0-8 0"/><path d="M12 13v5"/><path d="M10 16l2-2 2 2"/></svg>`;
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 14a5 5 0 1 1 6.5-5.5A4 4 0 1 1 15 16H7a3 3 0 0 1-1-5.8"/></svg>`;
}

async function renderWorldMap() {
  if (!worldMap) {
    worldMap = L.map("worldMap", {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 6,
      minZoom: 2,
    }).addTo(worldMap);
  }

  mapMarkers.forEach(m => worldMap.removeLayer(m));
  mapMarkers = [];

  const fetches = WORLD_CITIES.map(city =>
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
  );

  const results = await Promise.all(fetches);

  results.forEach((data, i) => {
    if (!data || !data.current_weather) return;
    const w = data.current_weather;
    const city = WORLD_CITIES[i];
    const color = tempColor(w.temperature);

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.6);box-shadow:0 2px 8px rgba(0,0,0,0.4);font-size:10px;font-weight:700;color:#fff;">${Math.round(w.temperature)}°</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker([city.lat, city.lon], { icon }).addTo(worldMap);
    marker.bindPopup(`
      <strong>${city.name}, ${city.country}</strong>
      ${Math.round(w.temperature)}°C &nbsp;|&nbsp; ${wmoIcon(w.weathercode)}
      <br><span style="font-size:0.75rem;color:var(--text3)">Wind ${w.windspeed} km/h</span>
    `);
    mapMarkers.push(marker);
  });
}

// INIT
renderWorldMap();
fetchWeather("Mumbai");
