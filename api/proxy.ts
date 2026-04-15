import type { IncomingMessage, ServerResponse } from 'node:http';

const ALLOWED_SOURCES = [
  'weatherapi',
  'openweathermap',
  'visualcrossing',
  'pirateweather',
  'tomorrowio',
] as const;
type AllowedSource = (typeof ALLOWED_SOURCES)[number];

function buildUpstreamUrl(source: AllowedSource, lat: string, lon: string): string | null {
  switch (source) {
    case 'weatherapi': {
      const key = process.env.WEATHERAPI_KEY;
      if (!key) return null;
      return `https://api.weatherapi.com/v1/forecast.json?key=${key}&q=${lat},${lon}&days=7&aqi=yes`;
    }
    case 'openweathermap': {
      const key = process.env.OPENWEATHERMAP_KEY;
      if (!key) return null;
      return `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${key}&units=metric`;
    }
    case 'visualcrossing': {
      const key = process.env.VISUALCROSSING_KEY;
      if (!key) return null;
      return `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}?key=${key}&unitGroup=metric&include=current`;
    }
    case 'pirateweather': {
      const key = process.env.PIRATEWEATHER_KEY;
      if (!key) return null;
      return `https://api.pirateweather.net/forecast/${key}/${lat},${lon}?units=si`;
    }
    case 'tomorrowio': {
      const key = process.env.TOMORROWIO_KEY;
      if (!key) return null;
      return `https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&apikey=${key}&units=metric&timesteps=1m,1h,1d`;
    }
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const url = new URL(req.url!, `http://${req.headers.host}`);
  const source = url.searchParams.get('source');
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');

  if (!source || !(ALLOWED_SOURCES as readonly string[]).includes(source)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Invalid source' }));
    return;
  }

  if (!lat || !lon) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Missing lat/lon' }));
    return;
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (
    isNaN(latNum) || isNaN(lonNum) ||
    !isFinite(latNum) || !isFinite(lonNum) ||
    latNum < -90 || latNum > 90 ||
    lonNum < -180 || lonNum > 180
  ) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Invalid coordinates' }));
    return;
  }

  const upstreamUrl = buildUpstreamUrl(source as AllowedSource, lat, lon);
  if (!upstreamUrl) {
    // Key not configured — frontend treats non-OK as "source unavailable"
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'API key not configured' }));
    return;
  }

  try {
    const upstream = await fetch(upstreamUrl, { signal: AbortSignal.timeout(8000) });
    const body = await upstream.text();

    res.statusCode = upstream.status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5-min cache at CDN edge
    res.end(body);
  } catch {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'Upstream request failed' }));
  }
}
