/** Driver Amplifier BOA: -10.00 to +10.00 dB in 0.25 steps (81 options) */
export const DA_BOA_OPTIONS: number[] = Array.from({ length: 81 }, (_, i) =>
  parseFloat((-10 + i * 0.25).toFixed(2))
);

/** Driver Amplifier temperature: -50 to +150 °C in 5° steps (41 options) */
export const DA_TEMP_OPTIONS: number[] = Array.from({ length: 41 }, (_, i) => -50 + i * 5);
