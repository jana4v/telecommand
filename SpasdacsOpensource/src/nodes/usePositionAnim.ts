import { ref, watch, onUnmounted } from "vue";

/**
 * Returns a reactive animVal that smoothly interpolates to the latest
 * position value over `duration` ms using ease-in-out cubic easing.
 * Interrupted transitions start from the current in-flight value so
 * there is no pop/jump.
 */
export function usePositionAnim(getPos: () => number, duration = 1000) {
  const animVal = ref(getPos());
  let rafId = 0;
  let from  = animVal.value;
  let to    = animVal.value;
  let t0    = 0;

  function tick(now: number) {
    const p = Math.min((now - t0) / duration, 1);
    // ease-in-out cubic
    const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    animVal.value = from + (to - from) * e;
    if (p < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      animVal.value = to;
      rafId = 0;
    }
  }

  watch(getPos, newPos => {
    cancelAnimationFrame(rafId);
    from = animVal.value;   // start from wherever the animation currently is
    to   = newPos;
    t0   = performance.now();
    rafId = requestAnimationFrame(tick);
  });

  onUnmounted(() => cancelAnimationFrame(rafId));

  return animVal;
}
