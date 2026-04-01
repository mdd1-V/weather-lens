import type {
  WeatherSourceData,
  ConsensusResult,
  MetricConsensus,
  SourceValue,
  LocationInfo,
  WeatherCondition,
} from "@/types/weather";

/**
 * Calculate weighted consensus for a numeric metric across sources.
 * Uses median-based outlier detection and agreement weighting.
 */
function computeMetricConsensus(
  values: { source: string; value: number }[]
): MetricConsensus {
  if (values.length === 0) {
    return { value: 0, confidence: 0, sources: [] };
  }

  if (values.length === 1) {
    return {
      value: values[0].value,
      confidence: 50,
      sources: [{ ...values[0], isOutlier: false }],
    };
  }

  // Sort by value to find median
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1].value + sorted[sorted.length / 2].value) / 2
      : sorted[Math.floor(sorted.length / 2)].value;

  // Calculate deviation threshold (20% of median, minimum 2 units)
  const threshold = Math.max(Math.abs(median) * 0.2, 2);

  // Tag outliers
  const tagged: SourceValue[] = values.map((v) => ({
    ...v,
    isOutlier: Math.abs(v.value - median) > threshold,
  }));

  // Weighted average: non-outliers get weight 1, outliers get weight 0.2
  let weightedSum = 0;
  let totalWeight = 0;
  for (const sv of tagged) {
    const weight = sv.isOutlier ? 0.2 : 1;
    weightedSum += sv.value * weight;
    totalWeight += weight;
  }
  const consensusValue = totalWeight > 0 ? weightedSum / totalWeight : median;

  // Confidence: based on agreement
  const nonOutliers = tagged.filter((s) => !s.isOutlier).length;
  const confidence = Math.round((nonOutliers / tagged.length) * 100);

  return {
    value: Math.round(consensusValue * 10) / 10,
    confidence,
    sources: tagged,
  };
}

/**
 * Determine consensus weather condition (majority vote).
 */
function consensusCondition(sources: WeatherSourceData[]): {
  condition: WeatherCondition;
  text: string;
} {
  const counts = new Map<WeatherCondition, number>();
  let bestCondition: WeatherCondition = "unknown";
  let bestText = "Unknown";
  let bestCount = 0;

  // Filter out 'unknown' so incomplete API adapters don't hijack the weather icon
  const validSources = sources.filter(s => s.current.condition !== "unknown");
  const sourcesToCount = validSources.length > 0 ? validSources : sources;

  for (const s of sourcesToCount) {
    const c = s.current.condition;
    const count = (counts.get(c) || 0) + 1;
    counts.set(c, count);
    if (count > bestCount) {
      bestCount = count;
      bestCondition = c;
      bestText = s.current.conditionText;
    }
  }

  return { condition: bestCondition, text: bestText };
}

/**
 * Run the full consensus analysis across all sources.
 */
export function analyzeConsensus(
  sources: WeatherSourceData[],
  location: LocationInfo
): ConsensusResult {
  if (sources.length === 0) {
    throw new Error("No weather data sources available");
  }

  // Helper to extract a metric from all sources
  const extract = (fn: (s: WeatherSourceData) => number) =>
    sources.map((s) => ({ source: s.source, value: fn(s) }));

  const temperature = computeMetricConsensus(
    extract((s) => s.current.temperature)
  );
  const feelsLike = computeMetricConsensus(
    extract((s) => s.current.feelsLike)
  );
  const humidity = computeMetricConsensus(
    extract((s) => s.current.humidity)
  );
  const windSpeed = computeMetricConsensus(
    extract((s) => s.current.windSpeed)
  );
  const windDirection = computeMetricConsensus(
    extract((s) => s.current.windDirection)
  );
  const pressure = computeMetricConsensus(
    extract((s) => s.current.pressure)
  );
  const visibility = computeMetricConsensus(
    extract((s) => s.current.visibility)
  );
  const uvIndex = computeMetricConsensus(
    extract((s) => s.current.uvIndex)
  );
  const dewPoint = computeMetricConsensus(
    extract((s) => s.current.dewPoint)
  );
  const cloudCover = computeMetricConsensus(
    extract((s) => s.current.cloudCover)
  );
  const precipitation = computeMetricConsensus(
    extract((s) => s.current.precipitation)
  );

  const { condition, text: conditionText } = consensusCondition(sources);

  // Overall confidence is the average of all metric confidences
  const allConfidences = [
    temperature, feelsLike, humidity, windSpeed, pressure,
    visibility, cloudCover, precipitation,
  ].map((m) => m.confidence);
  const overallConfidence = Math.round(
    allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
  );

  // Use the source with the most hourly data for hourly/daily forecasts
  const bestSource = [...sources].sort(
    (a, b) => b.hourly.length - a.hourly.length
  )[0];

  // Gather minutely data from the highest-resolution source (Tomorrow > Pirate > OM)
  const bestMinutelySource = [...sources]
    .filter((s) => s.minutely && s.minutely.length > 0)
    .sort((a, b) => (b.minutely?.length || 0) - (a.minutely?.length || 0))[0];
  
  const minutely = bestMinutelySource?.minutely || [];
  let nowcastText: string | undefined = undefined;

  if (minutely.length > 0) {
    const now = Date.now();
    const rainData = minutely.map(m => ({
      minsFromNow: Math.max(0, Math.round((new Date(m.time).getTime() - now) / 60000)),
      rain: m.precipitation > 0.1, // >0.1mm/h threshold
      intensity: m.precipitation
    })).filter(m => m.minsFromNow <= 60);

    if (rainData.length > 0) {
      const currentlyRaining = rainData[0].rain;
      const changePoint = rainData.find(m => m.rain !== currentlyRaining);

      if (currentlyRaining) {
        if (changePoint) nowcastText = `Rain expected to stop in ~${changePoint.minsFromNow} mins`;
        else nowcastText = `Rain continuing for the next hour`;
      } else {
        if (changePoint) {
          const isHeavy = changePoint.intensity > 2.5;
          nowcastText = `${isHeavy ? "Heavy" : "Light"} rain starting in ~${changePoint.minsFromNow} mins`;
        }
      }
    }
  }

  // Gather air quality, pollen, and astronomy from any source that has it
  const airQuality = sources.find((s) => s.airQuality)?.airQuality;
  const pollen = sources.find((s) => s.pollen)?.pollen;
  const astronomy = sources.find((s) => s.astronomy)?.astronomy;

  return {
    location,
    current: {
      temperature,
      feelsLike,
      humidity,
      windSpeed,
      windDirection,
      pressure,
      visibility,
      uvIndex,
      dewPoint,
      cloudCover,
      precipitation,
      condition,
      conditionText,
      isDay: bestSource.current.isDay,
    },
    hourly: bestSource.hourly,
    daily: bestSource.daily.length > 0 ? bestSource.daily : sources.find(s => s.daily.length > 0)?.daily || [],
    minutely,
    nowcastText,
    airQuality,
    pollen,
    astronomy,
    sources,
    overallConfidence,
    lastUpdated: Date.now(),
  };
}
