# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

This repo contains **themux**, a Next.js App Router application that acts as a theme customizer for shadcn/ui, with first-class support for Tailwind CSS v4 and v3 and multiple color formats (OKLCH, HSL, RGB, HEX). Users tweak a theme visually and then copy the generated CSS variables or CLI commands to apply the theme in their own projects.

## Commands & workflows

All commands assume you are in the repo root and using **Node.js 20+** with **pnpm**.

- **Install dependencies**
  - `pnpm install`

- **Run the dev server** (http://localhost:6789)
  - `pnpm dev`
  - Uses `next dev --turbopack -p 6789`.

- **Build for production**
  - `pnpm build`

- **Run the production server** (after `pnpm build`)
  - `pnpm start`

- **Lint the codebase**
  - `pnpm lint`
  - Runs `next lint` with the project ESLint config.

- **Generate shadcn registry theme files from presets**
  - `pnpm registry:r-themes`
  - Executes `src/scripts/generate-theme-registry.ts`, which converts all configured presets into shadcn `registry:style` JSON files under `public/r/themes` via `utils/registry/themes.ts`.

- **Automated tests**
  - There is currently **no test runner or test script configured** in `package.json`, and there are no `*.test.*` / `*.spec.*` files. To add tests, first introduce a test framework (e.g. Vitest, Jest, Playwright) and wire it into `package.json` before expecting test-related commands to work.

## Environment & external services

These environment variables influence runtime behavior:

- **Postgres / Drizzle ORM** (theme registry persistence)
  - `DATABASE_URL`
    - Used by `src/lib/db/index.ts` to create the `postgres` client and Drizzle `db` instance.
    - Required for code paths that hit `src/data/r/themes.ts` and `src/app/api/r/themes/[id]/route.ts`, or the server action in `src/actions/registry.ts`.

- **PostHog analytics**
  - `NEXT_PUBLIC_POSTHOG_KEY`
  - `NEXT_PUBLIC_POSTHOG_HOST`
    - Used in both `posthog.ts` (Node client) and `src/components/posthog-provider.tsx` (browser client) to capture page views and events.
    - `posthog-provider` sets `api_host: "/ingest"` with `ui_host` from `NEXT_PUBLIC_POSTHOG_HOST`, and enables extra debug logging in development.

- **Public base URL**
  - `NEXT_PUBLIC_BASE_URL`
    - Used by preview wrappers such as `src/components/block-viewer.tsx` and `src/components/demos/components-demo/component-wrapper.tsx` to build links to internal pages or shadcn documentation.

- **Theme registry endpoints** (for shadcn CLI integration)
  - `NEXT_PUBLIC_THEME_REGISTRY_URL`
  - `NEXT_PUBLIC_THEME_REGISTRY_API_URL`
    - Used in `src/components/customizer/copy-theme-cli.tsx` to construct `shadcn` CLI commands that fetch a theme JSON from either a static public URL or the API route. If these are unset, the “copy CLI command” feature will not generate a usable URL.

## High-level architecture

### 1. App shell and routing (Next.js App Router)

- The app uses the **Next.js App Router** under `src/app`.
- **`src/app/layout.tsx`** defines `RootLayout`, sets the site metadata, and wires global concerns:
  - Injects `<LoadTheme />` into `<head>` to set CSS variables from persisted theme configuration before hydration.
  - Wraps the app with `Providers` (`src/app/providers.tsx`), which in turn configures:
    - `PostHogProvider` for analytics (`src/components/posthog-provider.tsx`).
    - `NuqsAdapter` for URL-based state.
    - `ThemeProvider` (`src/components/theme-provider.tsx`) from `next-themes`, using the `class` attribute and `system` default.
  - Renders global utilities: `ThemeSync`, `FontLoader`, `Toaster` (from `ui/sonner`), and development helpers (`ReactScan`, `ScreenDevTools`).
- Top-level routes live in `src/app`:
  - `page.tsx` – landing page explaining the customizer and supported formats.
  - `dashboard/page.tsx`, `mail/page.tsx`, and `shadcn-themes/*` – use demo components to showcase themes in realistic layouts.
  - Standard Next.js special files like `error.tsx`, `not-found.tsx`, `loading.tsx`, and Open Graph image assets live here as well.

### 2. Theme configuration model

Theme configuration is centralized and persisted as a `ThemeConfig` structure.

- **Types**
  - `src/types/theme.ts` defines:
    - Primitive theme concepts: `ThemeMode`, `ColorFormat`, `TailwindVersion`, `RemValue`, `OklchValue`.
    - Token group types: `ThemeProperties`, `ColorProperties`, `SurfaceShades`, and theme presets (`Preset`, `PresetV4`, `ColorfulPreset`, `OtherPresets`).
    - `ThemeObject` – a logical theme preset with `name`, `label`, optional `radius` and `fonts`, and partial `light` / `dark` `ThemeProperties`.
    - `ThemeConfig` – the persisted configuration: `radius`, `surface` preset, `fonts`, and a `themeObject`.

- **Defaults and initial configuration**
  - `src/lib/themes.ts` defines:
    - `DEFAULT_RADIUS`, `DEFAULT_SURFACE`, `DEFAULT_FONTS`, and `DEFAULT_SHADOWS`.
    - `initialThemeConfig`, built from the neutral preset in `lib/colors.ts`, extended with the default shadow tokens in light mode and a default `shadow-color` in dark mode.

- **Persistence and core hooks**
  - `src/hooks/use-config.ts`
    - Wraps a `ThemeConfig` in a Jotai `atomWithStorage`, keyed by `LOCAL_STORAGE_KEYS.themeConfig` from `src/utils/constants.ts`.
    - Exposes `useConfig()` as `[config, setConfig]`, ensuring theme changes are persisted in `localStorage`.
  - `src/hooks/use-theme-config.ts`
    - Sits on top of `useConfig()` to provide higher-level operations:
      - Derived values like `currentThemeObject`, `currentSurfacePreset`, `currentRadius`, `currentFonts`, `currentPresetName`, and `currentPresetThemeObject` (looked up from `allPresetsArray` in `lib/colors.ts`).
      - `updateThemeConfig` – merges a new `ThemeObject` into the existing one using `mergeThemeObjectWithInitial` from `src/utils/theme-config.ts`, resetting surface, pulling in fonts from the theme, and updating radius.
      - `resetToDefault` – restores `initialThemeConfig`.
      - `resetToLatestThemePreset` – re-applies the selected preset merged with the current theme, while restoring its default radius and fonts.
      - `hasDefaultThemeChanged` / `hasCurrentPresetChanged` – diff helpers used by the UI to show whether the current configuration deviates from the baseline.

- **Token-level access and mutations**
  - `src/hooks/use-tokens.ts` is the main API for reading and writing individual theme tokens:
    - `getToken` – resolves a generic token (`ThemeProperty`), with special-casing for shadow tokens which mostly live in light mode.
    - `setToken` – writes a token either in both modes (`modesInSync`) or only the current mode.
    - `getColorToken` – reads a `ColorProperty` for the current mode; falls back to the initial config if needed.
    - `getActiveThemeColorToken` and `createTokenGetterForPreset` – help render preview swatches for any preset, independent of the current config.
    - `setColorToken`, `setColorTokenWithForeground`, `setPrimaryColorTokens` – utilities that compute foreground colors (using `getOptimalForegroundColor`) and keep related tokens like `ring` and sidebar colors in sync.
    - `setSurfaceShadesColorTokens` and `getActiveSurfaceShades` – work with `surfaceShadesPresets` to apply higher-level background presets across many tokens at once.

### 3. Theme application to the DOM

There are two key components responsible for pushing theme configuration into CSS variables.

- **Initial, pre-hydration theme load** – `src/components/load-theme.tsx`
  - Injects a small inline script into `<head>` that:
    - Reads the persisted `ThemeConfig` from `localStorage` (if available).
    - Determines the resolved mode based on `LOCAL_STORAGE_KEYS.nextThemesMode` and the `prefers-color-scheme` media query.
    - Chooses the active `light` or `dark` `themeObject`, radius, and fonts, falling back to `initialThemeConfig` when necessary.
    - Preloads the active font families (sans/serif/mono) via dynamically created `<link rel="stylesheet">` elements, using font metadata from `src/utils/fonts.ts`.
    - Computes `--token` CSS variables and applies them directly to `document.documentElement.style` to avoid a flash of unstyled theme.

- **Reactive theme synchronization** – `src/components/theme-sync.tsx`
  - Client component that:
    - Uses `useThemeConfig` and `next-themes`’s `useTheme()` to observe the current `ThemeConfig` and resolved mode.
    - Builds a `ThemeProperties` object containing the current theme tokens plus radius and font families.
    - Converts it to CSS variables via `getCssVarsFromThemeObject` (`lib/themes.ts`) and applies them to `:root` using `setStyleProperty` from `src/utils/set-attribute-to-element.ts`.
    - Calls `setShadowVariables` from `src/utils/shadows.ts` to keep Tailwind-style shadow tokens (`--shadow-*`) in sync with the underlying shadow map.
    - Invokes `usePresetSyncUrl()` so that preset choices can be reflected in the URL for shareable links.

### 4. UI layers and feature modules

- **UI primitives** – `src/components/ui/*`
  - A mostly standard shadcn/ui-inspired component set (Accordion, Alert, Button, Dialog, Slider, Tooltip, Sidebar, etc.).
  - Used throughout the app, especially in the customizer controls and demo layouts.

- **Customizer UI** – `src/components/customizer/*`
  - Contains the main controls that manipulate the theme:
    - Token-level controls (e.g. `color.tsx`, `token-color-picker.tsx`).
    - High-level presets and surface controls (`tailwind-v4-palette.tsx`, `SurfaceShadesControl`, `AllPresetsControl`, `RadiusControls`, `RadiusSliderControl`, `ShadowsControl` in `customizer-controls.tsx`).
    - UX helpers like `PasteColorControl`, which validates pasted colors, supports multiple formats, and updates tokens via `useTokens`.
  - Many controls depend on:
    - `useThemeConfig` for reading and updating the current `ThemeConfig`.
    - `useTokens` and `useSurfaceShades` for coordinated updates across multiple tokens.

- **Demos / previews** – `src/components/demos/*`
  - `cards-demo`, `components-demo`, `dashboard-demo`, and `mail-demo` directories provide realistic UI compositions that consume the theme tokens.
  - These are wired into routes under `src/app` (e.g. `dashboard/page.tsx`, `mail/page.tsx`) to show how the theme looks in different contexts.
  - `ComponentWrapper` and `BlockViewer` provide chrome around demo components, including:
    - Responsive viewport toggles (desktop/tablet/mobile) driven by `react-resizable-panels`.
    - Shortcuts and affordances for copying `shadcn` CLI commands or opening components in new tabs, often using `NEXT_PUBLIC_BASE_URL`.

- **Devtools and utilities**
  - `src/components/devtools/*` contains tooling such as `ReactScan`, `ScreenDevTools`, and a `VisuallyHidden` debug component. These typically no-op or hide themselves when `process.env.NODE_ENV === "production"`.
  - Generic hooks live under `src/hooks/` (media query, fullscreen, copy-to-clipboard, meta colors, mobile detection, click-outside, debounced callbacks, etc.) and are used throughout the UI.

### 5. Theme export and shadcn registry integration

There are two related but distinct pathways for turning the current configuration into artifacts users can consume.

- **Raw CSS / Tailwind theme code generation** – `src/utils/theme-style-generator.ts`
  - `generateThemeCode` accepts a `ThemeConfig` plus options (`ColorFormat`, `TailwindVersion`, and whether to emit font and shadow vars) and returns a string with:
    - A `:root` block for light mode containing CSS custom properties for all theme tokens, fonts, radius, and optionally shadow variables.
    - A `.dark` block for dark mode.
    - For Tailwind v4, an additional `@theme inline { ... }` block that maps `--background`, `--foreground`, etc. into Tailwind’s `--color-*` and radius variables, optionally including shadow variables.
  - This is the core of the “copy CSS variables” experience exposed in the UI.

- **shadcn registry items** – `src/utils/registry/themes.ts` and `src/scripts/generate-theme-registry.ts`
  - `utils/registry/themes.ts` provides functions to convert a `ThemeObject` into a **shadcn registry item** (`RegistryItem` from `shadcn/registry`):
    - `convertThemeStyles` normalizes and formats all color tokens into the target format using `colorFormatter`, and merges them with `initialThemeConfig`.
    - `buildThemeRegistryItem` assembles the registry JSON, including:
      - `cssVars.theme` for global font and tracking variables.
      - `cssVars.light` and `cssVars.dark`, each containing color tokens and, for light mode, shadow and spacing-related tokens derived via `getShadowMap`.
      - Validation via `registryItemSchema.safeParse` to ensure the structure matches the official schema.
    - `generateThemeRegistryFromPreset` and `generateThemeRegistryFromThemeObject` write the validated registry item JSON into `public/r/themes` using `writeToRegistry`.
  - `src/scripts/generate-theme-registry.ts` iterates over `allPresets` from `lib/colors.ts` and calls `generateThemeRegistryFromPreset` for each, so that all built-in presets have a corresponding registry file.

- **Server actions and API for dynamic themes**
  - `src/actions/registry.ts` defines the `"use server"` action `generateThemeRegistryItemFromThemeObject`, which:
    - Assigns a UUID-based `name` to the provided `ThemeObject`.
    - Builds the corresponding registry item using `buildThemeRegistryItem`.
    - Persists it into Postgres via `createRegistryItem` in `src/data/r/themes.ts`.
  - `src/data/r/themes.ts` provides typed Drizzle accessors for the `registry` table (`getRegistryItem`, `createRegistryItem`).
  - `src/app/api/r/themes/[id]/route.ts` exposes a GET endpoint that:
    - Fetches a registry row by `id`.
    - Validates the stored JSON using `registryItemSchema.safeParse`.
    - Returns the parsed registry item or a 500 error if validation fails.
  - `CopyThemeCLI` (`src/components/customizer/copy-theme-cli.tsx`) ties this together in the UI by:
    - Optionally calling the server action to generate a new registry item for the current theme.
    - Building a `shadcn` CLI command like `npx shadcn@latest add <registry-url>` using `NEXT_PUBLIC_THEME_REGISTRY_URL` or `NEXT_PUBLIC_THEME_REGISTRY_API_URL` and the user’s preferred package manager.

### 6. Data access & persistence layer

- **Database schema and connection**
  - `src/lib/db/schema.ts` defines a single `registry` table with:
    - `id` (UUID primary key), `name` and `type` text fields, `registryItem` as `jsonb`, and `createdAt` as a timestamp.
  - `src/lib/db/index.ts` wires Drizzle to Postgres using `postgres` (the `postgres` JS client) and exports both the `client` and `db` instances, plus a helper `getDbConnectionString()` that throws if `DATABASE_URL` is missing.

### 7. Things to keep in mind when extending the project

- When adding **new theme tokens or presets**, update the central types in `src/types/theme.ts` and the default configuration in `src/lib/themes.ts`, then extend `theme-style-generator.ts` and `utils/registry/themes.ts` to ensure new tokens are:
  - Represented as CSS custom properties.
  - Included in Tailwind v4 `@theme inline` mappings and shadcn registry items where appropriate.
- When changing how tokens are stored, keep `use-theme-config`, `use-tokens`, `LoadTheme`, and `ThemeSync` in sync—they jointly define how theme state is persisted, derived, and applied to the DOM.
- Features that depend on the registry database (server actions and `/api/r/themes/[id]`) require a working Postgres instance and valid `DATABASE_URL`; UI flows around `CopyThemeCLI` assume those endpoints will be reachable.
