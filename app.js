const cities = {
  northridge: { name: "Northridge, CA", latitude: 34.24, longitude: -118.53 },
  "santa-monica": { name: "Santa Monica, CA", latitude: 34.02, longitude: -118.49 },
  "san-francisco": { name: "San Francisco, CA", latitude: 37.77, longitude: -122.42 },
  "san-diego": { name: "San Diego, CA", latitude: 32.72, longitude: -117.16 },
};

const byId = (id) => document.getElementById(id);
const citySelect = byId("city");
const refreshButton = byId("refresh");
const status = byId("status");
const forecast = byId("forecast");
const placeholder = byId("forecast-placeholder");
const weatherPanels = document.querySelectorAll("[aria-busy]");
let activeRequest;

function describeWeather(code, isDay = true) {
  if (code === 0) return ["Clear", isDay ? "☀" : "☾"];
  if (code === 1 || code === 2) return ["Partly cloudy", "⛅"];
  if (code === 3) return ["Overcast", "☁"];
  if ([45, 48].includes(code)) return ["Fog", "≋"];
  if ([51, 53, 55, 56, 57].includes(code)) return ["Drizzle", "☂"];
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ["Rain", "☂"];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ["Snow", "❄"];
  if ([95, 96, 99].includes(code)) return ["Thunderstorms", "ϟ"];
  return ["Conditions unavailable", "—"];
}

function formatValue(value, unit) {
  return Number.isFinite(value) ? Math.round(value) + unit : "—";
}

function localTime(timestamp) {
  const [hour, minute] = timestamp.slice(11, 16).split(":").map(Number);
  return (hour % 12 || 12) + (minute ? ":" + String(minute).padStart(2, "0") : "") +
    (hour < 12 ? " AM" : " PM");
}

function hourlyCard(time, temperature, chance, weatherCode, isDay) {
  const card = document.createElement("li");
  card.className = "hour-card";
  const label = document.createElement("time");
  label.dateTime = time;
  label.textContent = localTime(time);

  const [description, symbol] = describeWeather(weatherCode, isDay);
  const icon = document.createElement("span");
  icon.className = "hour-icon";
  icon.setAttribute("role", "img");
  icon.setAttribute("aria-label", description);
  icon.title = description;
  icon.textContent = symbol;

  const reading = document.createElement("strong");
  reading.textContent = formatValue(temperature, "°F");
  const rain = document.createElement("span");
  rain.className = "chance";
  rain.textContent = Number.isFinite(chance) ? Math.round(chance) + "% rain" : "Rain —";
  card.append(label, icon, reading, rain);
  return card;
}

function renderWeather({ current, hourly, timezone_abbreviation: timezone }) {
  const nextHours = hourly.time.flatMap((time, index) =>
    time > current.time ? [hourlyCard(
      time,
      hourly.temperature_2m[index],
      hourly.precipitation_probability[index],
      hourly.weather_code[index],
      hourly.is_day[index] === 1,
    )] : [],
  ).slice(0, 8);
  const [description, icon] = describeWeather(current.weather_code, current.is_day === 1);
  byId("temperature").textContent = formatValue(current.temperature_2m, "°F");
  byId("condition").textContent = description;
  byId("weather-icon").textContent = icon;
  byId("feels-like").textContent = formatValue(current.apparent_temperature, "°F");
  byId("humidity").textContent = formatValue(current.relative_humidity_2m, "%");
  byId("wind").textContent = formatValue(current.wind_speed_10m, " mph");
  forecast.replaceChildren(...nextHours);
  placeholder.hidden = nextHours.length > 0;
  placeholder.textContent = "Hourly forecast unavailable.";
  status.textContent = "Conditions at " + localTime(current.time) + " " + timezone;
}

async function loadWeather() {
  activeRequest?.abort();
  const request = new AbortController();
  activeRequest = request;
  const timeout = setTimeout(() => request.abort(), 12000);
  const city = cities[citySelect.value];

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: city.latitude,
    longitude: city.longitude,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    hourly: "temperature_2m,precipitation_probability,weather_code,is_day",
    forecast_hours: "9",
    timezone: "auto",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
  });

  byId("location-heading").textContent = city.name;
  for (const id of ["temperature", "weather-icon", "feels-like", "humidity", "wind"]) {
    byId(id).textContent = "—";
  }
  byId("condition").textContent = "Loading conditions…";
  forecast.replaceChildren();
  placeholder.hidden = false;
  placeholder.textContent = "Loading hourly forecast…";
  status.classList.remove("error");
  status.textContent = "Loading forecast for " + city.name + "…";
  refreshButton.disabled = true;
  weatherPanels.forEach((panel) => panel.setAttribute("aria-busy", "true"));

  try {
    const response = await fetch(url, { signal: request.signal });
    if (!response.ok) throw new Error("Forecast HTTP status " + response.status);
    const data = await response.json();
    if (activeRequest === request) renderWeather(data);
  } catch {
    if (activeRequest !== request) return;
    status.classList.add("error");
    status.textContent = "Couldn’t load the forecast. Use Refresh forecast to try again.";
    byId("condition").textContent = "Conditions unavailable";
    placeholder.textContent = "Hourly forecast unavailable.";
  } finally {
    clearTimeout(timeout);
    if (activeRequest === request) {
      refreshButton.disabled = false;
      weatherPanels.forEach((panel) => panel.setAttribute("aria-busy", "false"));
    }
  }
}

citySelect.addEventListener("change", loadWeather);
refreshButton.addEventListener("click", loadWeather);
loadWeather();

const replay = byId("replay");
const animationNote = byId("animation-note");
const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");

function setupAnimation({ Tween, Easing, Group }) {
  const signature = byId("signature");
  const words = signature.textContent.trim().split(/\s+/);
  signature.replaceChildren();
  const letters = [];

  for (const word of words) {
    if (letters.length) signature.append(" ");
    const wordSpan = document.createElement("span");
    wordSpan.className = "word";
    wordSpan.setAttribute("aria-hidden", "true");
    for (const character of word) {
      const letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = character;
      wordSpan.append(letter);
      letters.push(letter);
    }
    signature.append(wordSpan);
  }

  const group = new Group();
  let frameId;

  function resetAnimation() {
    cancelAnimationFrame(frameId);
    group.removeAll();
    letters.forEach((letter) => letter.style.removeProperty("transform"));
  }

  function playWave() {
    resetAnimation();
    if (motionPreference.matches) return;
    const start = performance.now();
    letters.forEach((letter, index) => {
      const position = { y: 0, angle: 0 };
      new Tween(position, group)
        .to({ y: [0, -18, 5, 0], angle: [0, -9, 5, 0] }, 680)
        .delay(index * 55)
        .easing(Easing.Sinusoidal.InOut)
        .onUpdate(() => {
          letter.style.transform = "translateY(" + position.y + "px) rotate(" + position.angle + "deg)";
        })
        .start(start);
    });

    function animate(time) {
      if (group.update(time) && group.getAll().length) frameId = requestAnimationFrame(animate);
    }
    frameId = requestAnimationFrame(animate);
  }

  function updateMotionPreference() {
    replay.disabled = motionPreference.matches;
    animationNote.textContent = motionPreference.matches ? "Reduced motion is enabled" : "Tween.js";
    if (motionPreference.matches) resetAnimation();
  }

  replay.addEventListener("click", playWave);
  motionPreference.addEventListener("change", updateMotionPreference);
  updateMotionPreference();
  playWave();
}

if (window.TWEEN) {
  setupAnimation(window.TWEEN);
} else {
  animationNote.textContent = "Animation unavailable. Reload to try again.";
}
