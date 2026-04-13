import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  let url: string;
  if (query) {
    url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`;
  } else if (lat && lon) {
    // Reverse geocode: search nearby city name using Open-Meteo
    // Open-Meteo doesn't have reverse geocoding, so we use a workaround via their weather API
    // and then search for the nearest city
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&timezone=auto`
    );
    const weatherData = await weatherRes.json();
    // The timezone often contains the city name
    const tz = weatherData.timezone || "";
    const cityGuess = tz.split("/").pop()?.replace(/_/g, " ") || "";

    if (cityGuess) {
      url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityGuess)}&count=1&language=en&format=json`;
    } else {
      return NextResponse.json({ results: [] });
    }
  } else {
    return NextResponse.json({ results: [] }, { status: 400 });
  }

  const res = await fetch(url);
  const data = await res.json();

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
