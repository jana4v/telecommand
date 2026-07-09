import { ref, watch, onUnmounted } from "vue";
import gsap from "gsap";

/**
 * Returns a smoothly-tweened reactive ref that animates toward the latest
 * value emitted by `getVal` whenever it changes.
 *
 * @param getVal   Reactive getter for the source value
 * @param duration Tween duration in seconds (default 0.55)
 * @param ease     GSAP ease string (default "power2.out")
 */
export function useGsapTween(
  getVal: () => number,
  duration = 0.55,
  ease = "power2.out",
) {
  const smooth = ref(getVal());
  const proxy  = { v: getVal() };
  let   tween: gsap.core.Tween | null = null;

  watch(getVal, (newVal) => {
    tween?.kill();
    tween = gsap.to(proxy, {
      v: newVal,
      duration,
      ease,
      onUpdate() { smooth.value = proxy.v; },
    });
  });

  onUnmounted(() => tween?.kill());

  return smooth;
}
