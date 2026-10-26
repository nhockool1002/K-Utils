import type { PhotoFilterParams } from "../types";

/** All sliders at their neutral/no-op value — used as the baseline for both
 * the Chỉnh ảnh tab and the video "Chỉnh màu" section. */
export const NEUTRAL_GRADING_PARAMS: PhotoFilterParams = {
  temperature: 0,
  tint: 0,
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  vibrance: 0,
  saturation: 0,
  split_shadow_hue: 220,
  split_shadow_sat: 0,
  split_highlight_hue: 40,
  split_highlight_sat: 0,
  split_balance: 0,
  grain: 0,
  vignette: 0,
  fade: 0,
  intensity: 100,
};
