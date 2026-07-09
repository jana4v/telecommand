import { ref, onMounted, onUnmounted } from "vue";
import gsap from "gsap";

/**
 * Drives a continuously-spinning angle (degrees) based on RPM.
 *
 * Visual rotation is scaled so that max-RPM → 1 full rotation/sec and any
 * non-zero speed shows at least 60 deg/s — keeping the animation visible
 * without trying to simulate 6000 RPM literally.
 *
 * @param getSpeedRpm  Getter returning current absolute speed in RPM
 * @param getDirection Getter returning +1 (CW) or -1 (CCW)
 * @param maxRpm       RPM value that maps to maximum visual speed (default 6000)
 */
export function useGsapSpin(
  getSpeedRpm: () => number,
  getDirection: () => number = () => 1,
  maxRpm = 6000,
) {
  const angle = ref(0);

  // GSAP ticker callback: (time, deltaMs, frame)
  // deltaMs = milliseconds since the last tick
  function tick(_time: number, deltaMs: number) {
    const rpm = Math.abs(getSpeedRpm());
    if (rpm < 0.5) return;                                // stopped — no-op
    const dir = getDirection() === -1 ? -1 : 1;
    // deg/s proportional to speed, minimum 60 deg/s (visible even at low RPM)
    const dps = Math.max((rpm / maxRpm) * 360, 60) * dir;
    angle.value = ((angle.value + dps * (deltaMs / 1000)) % 360 + 360) % 360;
  }

  onMounted(() => gsap.ticker.add(tick));
  onUnmounted(() => gsap.ticker.remove(tick));

  return angle;
}
