export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

export interface CityData {
  id: string;
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  rainfallProbabilities: number[]; // 366 values, total precip probability
  rainProbabilities: number[];     // rain-only probability
  snowProbabilities: number[];     // snow-only probability
  otherProbabilities: number[];    // other precip (sleet, hail, etc.)
}

const YEARS_OF_DATA = 30;
const END_YEAR = 2024;
const START_YEAR = END_YEAR - YEARS_OF_DATA + 1;
const PRECIPITATION_THRESHOLD = 0.2; // mm
const SNOW_THRESHOLD = 0.1; // cm
const HALF_LIFE_YEARS = 15;
const SMOOTHING_WINDOW = 5;

export async function searchCities(query: string): Promise<GeocodingResult[]> {
  if (query.length < 2) return [];
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return data.results || [];
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null> {
  const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
  const data = await res.json();
  const results = data.results || [];
  return results.length > 0 ? results[0] : null;
}

export async function fetchCityRainfall(city: GeocodingResult): Promise<CityData> {
  const res = await fetch(
    `/api/rainfall?lat=${city.latitude}&lon=${city.longitude}`
  );
  const data = await res.json();

  const dates: string[] = data.daily.time;
  const precip: (number | null)[] = data.daily.precipitation_sum;
  const rain: (number | null)[] = data.daily.rain_sum;
  const snow: (number | null)[] = data.daily.snowfall_sum;

  const { total, rainProb, snowProb, otherProb } = computeProbabilities(dates, precip, rain, snow);

  const displayName = city.admin1
    ? `${city.name}, ${city.admin1}, ${city.country}`
    : `${city.name}, ${city.country}`;

  return {
    id: `${city.latitude.toFixed(4)}_${city.longitude.toFixed(4)}`,
    name: city.name,
    displayName,
    latitude: city.latitude,
    longitude: city.longitude,
    rainfallProbabilities: total,
    rainProbabilities: rainProb,
    snowProbabilities: snowProb,
    otherProbabilities: otherProb,
  };
}

function computeProbabilities(
  dates: string[],
  precip: (number | null)[],
  rain: (number | null)[],
  snow: (number | null)[]
): { total: number[]; rainProb: number[]; snowProb: number[]; otherProb: number[] } {
  const weightedTotal = new Array(366).fill(0);
  const weightedTotalDays = new Array(366).fill(0);
  const weightedRain = new Array(366).fill(0);
  const weightedSnow = new Array(366).fill(0);

  for (let i = 0; i < dates.length; i++) {
    const date = new Date(dates[i] + "T00:00:00");
    const year = date.getFullYear();
    const dayOfYear = getDayOfYear(date);
    if (dayOfYear < 0 || dayOfYear >= 366) continue;

    const yearsAgo = END_YEAR - year;
    const weight = Math.pow(2, -yearsAgo / HALF_LIFE_YEARS);

    const precipVal = precip[i];
    if (precipVal === null || precipVal === undefined) continue;

    weightedTotalDays[dayOfYear] += weight;

    if (precipVal > PRECIPITATION_THRESHOLD) {
      weightedTotal[dayOfYear] += weight;

      const rainVal = rain[i] ?? 0;
      const snowVal = snow[i] ?? 0;
      const hadRain = rainVal > PRECIPITATION_THRESHOLD;
      const hadSnow = snowVal > SNOW_THRESHOLD;

      if (hadRain) weightedRain[dayOfYear] += weight;
      if (hadSnow) weightedSnow[dayOfYear] += weight;
    }
  }

  const rawTotal = new Array(366).fill(0);
  const rawRain = new Array(366).fill(0);
  const rawSnow = new Array(366).fill(0);
  const rawOther = new Array(366).fill(0);

  for (let d = 0; d < 366; d++) {
    if (weightedTotalDays[d] === 0) continue;
    const totalPct = (weightedTotal[d] / weightedTotalDays[d]) * 100;
    const rainPct = (weightedRain[d] / weightedTotalDays[d]) * 100;
    const snowPct = (weightedSnow[d] / weightedTotalDays[d]) * 100;

    rawTotal[d] = totalPct;

    // Normalize rain+snow+other to sum to total
    const sumParts = rainPct + snowPct;
    if (sumParts > 0 && sumParts > totalPct) {
      const scale = totalPct / sumParts;
      rawRain[d] = rainPct * scale;
      rawSnow[d] = snowPct * scale;
      rawOther[d] = 0;
    } else {
      rawRain[d] = rainPct;
      rawSnow[d] = snowPct;
      rawOther[d] = Math.max(0, totalPct - rainPct - snowPct);
    }
  }

  return {
    total: smooth(rawTotal, SMOOTHING_WINDOW),
    rainProb: smooth(rawRain, SMOOTHING_WINDOW),
    snowProb: smooth(rawSnow, SMOOTHING_WINDOW),
    otherProb: smooth(rawOther, SMOOTHING_WINDOW),
  };
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) - 1;
}

function smooth(data: number[], window: number): number[] {
  const half = Math.floor(window / 2);
  const result = new Array(data.length).fill(0);

  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = -half; j <= half; j++) {
      const idx = ((i + j) % 366 + 366) % 366;
      sum += data[idx];
      count++;
    }
    result[i] = count > 0 ? sum / count : 0;
  }

  return result;
}

export const SUGGESTED_CITIES: GeocodingResult[] = [
  { id: 5128581, name: "New York", latitude: 40.7143, longitude: -74.006, country: "United States", admin1: "New York" },
  { id: 2643743, name: "London", latitude: 51.5085, longitude: -0.1257, country: "United Kingdom", admin1: "England" },
  { id: 1850147, name: "Tokyo", latitude: 35.6895, longitude: 139.6917, country: "Japan", admin1: "Tokyo" },
];

export const CITY_COLORS = [
  "rgb(37, 99, 205)",    // blue (darker)
  "rgb(200, 50, 50)",    // red (darker)
  "rgb(22, 163, 74)",    // green (darker)
  "rgb(139, 62, 208)",   // purple (darker)
  "rgb(217, 90, 11)",    // orange (darker)
  "rgb(206, 55, 135)",   // pink (darker)
  "rgb(13, 148, 136)",   // teal (darker)
  "rgb(202, 148, 2)",    // yellow (darker)
];
