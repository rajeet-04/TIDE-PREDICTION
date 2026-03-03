// ─────────────────────────────────────────────────────────
// Weather Service — Layer 2: Meteorological Data from Open-Meteo
// ─────────────────────────────────────────────────────────
const OPEN_METEO_BASE =
    process.env.OPEN_METEO_BASE_URL ||
    "https://api.open-meteo.com/v1/forecast";

/**
 * Fetch current meteorological conditions for a coordinate.
 * Uses the Open-Meteo forecast API (free, no API key).
 *
 * Returns:
 *   - pressure_msl  (hPa) — mean sea level pressure
 *   - wind_speed    (km/h) — wind speed at 10m
 *   - wind_direction (°) — wind direction at 10m
 *   - temperature   (°C) — air temperature at 2m
 */
export async function getCurrentWeather(lat, lon) {
    const url = new URL(OPEN_METEO_BASE);
    url.searchParams.set("latitude", lat);
    url.searchParams.set("longitude", lon);
    url.searchParams.set(
        "current",
        "pressure_msl,wind_speed_10m,wind_direction_10m,temperature_2m"
    );
    url.searchParams.set("wind_speed_unit", "kmh");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url.toString());

    if (!response.ok) {
        throw new Error(
            `Open-Meteo API error: ${response.status} ${response.statusText}`
        );
    }

    const data = await response.json();

    if (!data.current) {
        throw new Error("Open-Meteo returned no current weather data");
    }

    return {
        pressure_msl: data.current.pressure_msl, // hPa
        wind_speed: data.current.wind_speed_10m, // km/h
        wind_direction: data.current.wind_direction_10m, // degrees
        temperature: data.current.temperature_2m, // °C
        time: data.current.time,
    };
}
