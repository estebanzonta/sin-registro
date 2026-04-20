type TimingLabel = {
  label: string;
  durationMs: number;
};

const DEFAULT_SLOW_REQUEST_MS = 400;
const DEFAULT_VERBOSE_TIMING = process.env.NODE_ENV !== 'production';

function roundTiming(value: number) {
  return Math.round(value * 10) / 10;
}

export function nowMs() {
  return performance.now();
}

export function readSlowRequestThresholdMs() {
  const raw = Number(process.env.SLOW_REQUEST_THRESHOLD_MS || DEFAULT_SLOW_REQUEST_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SLOW_REQUEST_MS;
}

export function shouldLogTiming() {
  return process.env.LOG_REQUEST_TIMING === 'true' || DEFAULT_VERBOSE_TIMING;
}

export function shouldLogSlowRequest(durationMs: number) {
  return durationMs >= readSlowRequestThresholdMs();
}

export function formatTimingHeader(timings: TimingLabel[]) {
  return timings
    .filter((timing) => timing.durationMs >= 0)
    .map((timing) => `${timing.label};dur=${roundTiming(timing.durationMs)}`)
    .join(', ');
}

export function logTiming(scope: string, timings: TimingLabel[], details?: Record<string, unknown>) {
  const totalMs = timings.find((timing) => timing.label === 'total')?.durationMs
    ?? timings.reduce((sum, timing) => sum + timing.durationMs, 0);

  if (!shouldLogTiming() && !shouldLogSlowRequest(totalMs)) {
    return;
  }

  console.log(`[timing] ${scope}`, {
    totalMs: roundTiming(totalMs),
    timings: timings.map((timing) => ({
      label: timing.label,
      durationMs: roundTiming(timing.durationMs),
    })),
    ...(details || {}),
  });
}
