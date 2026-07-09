import type { GuidedCategoryDef } from "../types";

export const plotGraph: GuidedCategoryDef = {
  params: [
    { key: "x",  label: "X Telemetry",  hint: "optional when X-axis is Local Time", optional: true },
    { key: "y1", label: "Y Series 1",   hint: "primary Y telemetry" },
    { key: "y2", label: "Y Series 2",   hint: "optional", optional: true },
    { key: "y3", label: "Y Series 3",   hint: "optional", optional: true },
    { key: "y4", label: "Y Series 4",   hint: "optional", optional: true },
  ],
  body: () =>
    `return {\n` +
    `  plot_x: x,\n` +
    `  plot_y_0: y1,\n` +
    `  plot_y_1: y2,\n` +
    `  plot_y_2: y3,\n` +
    `  plot_y_3: y4,\n` +
    `};\n`,
};
