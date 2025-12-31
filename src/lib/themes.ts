import { ThemeConfig, ThemeProperties } from "@/types/theme";
import { basePresetsV4 } from "./colors";

export function getCssVarsFromThemeObject(
  themeProperties: Partial<ThemeProperties>,
) {
  const cssVars = {} as Record<string, string>;

  for (const [key, value] of Object.entries(themeProperties)) {
    cssVars[`--${key}`] = value;
  }

  return cssVars;
}

export const DEFAULT_RADIUS = "0.625rem"; // 10px

export const DEFAULT_SURFACE = "default";

export const DEFAULT_SPACING = "0.25rem"; // Tailwind's default spacing unit (1)

// Button padding
export const DEFAULT_BUTTON_PADDING = "0.5rem 1rem"; // Typical button padding (y x) - legacy combined format
export const DEFAULT_BUTTON_PADDING_Y = "0.5rem"; // Vertical button padding
export const DEFAULT_BUTTON_PADDING_X = "1rem"; // Horizontal button padding

// Input padding
export const DEFAULT_INPUT_PADDING_Y = "0.5rem"; // Vertical input padding
export const DEFAULT_INPUT_PADDING_X = "0.75rem"; // Horizontal input padding

// Card padding
export const DEFAULT_CARD_PADDING = "1.5rem"; // Card content padding

// Section padding
export const DEFAULT_SECTION_PADDING_Y = "4rem"; // Vertical section padding
export const DEFAULT_SECTION_PADDING_X = "1rem"; // Horizontal section padding

// Fallback defaults for spacing tokens (used when token not found in theme)
export const SPACING_DEFAULTS: Record<string, string> = {
  spacing: DEFAULT_SPACING,
  "button-padding": DEFAULT_BUTTON_PADDING,
  "button-padding-y": DEFAULT_BUTTON_PADDING_Y,
  "button-padding-x": DEFAULT_BUTTON_PADDING_X,
  "input-padding-y": DEFAULT_INPUT_PADDING_Y,
  "input-padding-x": DEFAULT_INPUT_PADDING_X,
  "card-padding": DEFAULT_CARD_PADDING,
  "section-padding-y": DEFAULT_SECTION_PADDING_Y,
  "section-padding-x": DEFAULT_SECTION_PADDING_X,
};

// from  @node_modules/tailwindcss/theme.css
export const DEFAULT_FONTS = {
  "font-sans": `ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
    'Noto Color Emoji'`,
  "font-serif": `ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif`,
  "font-mono": `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace`,
};

// from  @node_modules/tailwindcss/theme.css
// --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
export const DEFAULT_SHADOWS = {
  "shadow-color": `hsl(0 0% 0%)`, // Base color from rgb(0 0 0 / 0.1)
  "shadow-opacity": `0.1`, // Opacity from rgb(0 0 0 / 0.1)
  "shadow-blur": `3px`, // Blur radius
  "shadow-spread": `0px`, // Spread radius
  "shadow-offset-x": `0`, // X offset
  "shadow-offset-y": `1px`, // Y offset
};

export const initialThemeConfig: ThemeConfig = {
  radius: DEFAULT_RADIUS,
  surface: DEFAULT_SURFACE,
  fonts: {
    sans: basePresetsV4.neutral.fonts?.sans || DEFAULT_FONTS["font-sans"],
    serif: basePresetsV4.neutral.fonts?.serif || DEFAULT_FONTS["font-serif"],
    mono: basePresetsV4.neutral.fonts?.mono || DEFAULT_FONTS["font-mono"],
  },
  themeObject: {
    ...basePresetsV4.neutral,
    light: {
      ...basePresetsV4.neutral.light,
      ...DEFAULT_SHADOWS,
      spacing: DEFAULT_SPACING,
      "button-padding": DEFAULT_BUTTON_PADDING,
      "button-padding-y": DEFAULT_BUTTON_PADDING_Y,
      "button-padding-x": DEFAULT_BUTTON_PADDING_X,
      "input-padding-y": DEFAULT_INPUT_PADDING_Y,
      "input-padding-x": DEFAULT_INPUT_PADDING_X,
      "card-padding": DEFAULT_CARD_PADDING,
      "section-padding-y": DEFAULT_SECTION_PADDING_Y,
      "section-padding-x": DEFAULT_SECTION_PADDING_X,
    },
    dark: {
      ...basePresetsV4.neutral.dark,
      "shadow-color": DEFAULT_SHADOWS["shadow-color"],
      spacing: DEFAULT_SPACING,
      "button-padding": DEFAULT_BUTTON_PADDING,
      "button-padding-y": DEFAULT_BUTTON_PADDING_Y,
      "button-padding-x": DEFAULT_BUTTON_PADDING_X,
      "input-padding-y": DEFAULT_INPUT_PADDING_Y,
      "input-padding-x": DEFAULT_INPUT_PADDING_X,
      "card-padding": DEFAULT_CARD_PADDING,
      "section-padding-y": DEFAULT_SECTION_PADDING_Y,
      "section-padding-x": DEFAULT_SECTION_PADDING_X,
    },
  },
};
