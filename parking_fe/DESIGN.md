---
name: Saturated Canvas
colors:
  surface: '#fdf8f8'
  surface-dim: '#ddd9d8'
  surface-bright: '#fdf8f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3f2'
  surface-container: '#f1edec'
  surface-container-high: '#ebe7e6'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#444748'
  inverse-surface: '#313030'
  inverse-on-surface: '#f4f0ef'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c9c6c5'
  secondary: '#615e57'
  on-secondary: '#ffffff'
  secondary-container: '#e7e2d8'
  on-secondary-container: '#67645d'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1d1b1a'
  on-tertiary-container: '#868381'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c9c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#e7e2d8'
  secondary-fixed-dim: '#cac6bd'
  on-secondary-fixed: '#1d1c16'
  on-secondary-fixed-variant: '#494740'
  tertiary-fixed: '#e6e1df'
  tertiary-fixed-dim: '#cac6c3'
  on-tertiary-fixed: '#1d1b1a'
  on-tertiary-fixed-variant: '#484645'
  background: '#fdf8f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
  brand-pink: '#ff4d8b'
  brand-teal: '#1a3a3a'
  brand-lavender: '#b8a4ed'
  brand-peach: '#ffb084'
  brand-ochre: '#e8b94a'
  brand-cream-card: '#f5f0e0'
  surface-soft: '#faf5e8'
  ink-muted: '#6a6a6a'
  hairline: '#e5e5e5'
typography:
  display-xl:
    fontFamily: Be Vietnam Pro
    fontSize: 72px
    fontWeight: '500'
    lineHeight: 72px
    letterSpacing: -2.5px
  display-xl-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 36px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -1.5px
  display-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 56px
    fontWeight: '500'
    lineHeight: 60px
    letterSpacing: -2px
  display-md:
    fontFamily: Be Vietnam Pro
    fontSize: 40px
    fontWeight: '500'
    lineHeight: 44px
    letterSpacing: -1px
  title-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.3px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0px
  label-upper:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 1.5px
  button:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  section: 96px
  max-width: 1280px
---

## Brand & Style

The design system is built on the philosophy of **Playful Materiality**. It subverts the clinical coldness often found in data-driven SaaS by leaning into a hand-crafted, tactile aesthetic inspired by claymation and physical canvases. The target audience is modern operators who value sophistication but crave a tool that feels creative and approachable.

The style is a hybrid of **Modern Minimalism** and **High-Contrast Bold**. It utilizes a "Canvas Strategy," where a warm, neutral environment serves as the floor for high-energy, saturated color blocks. Visual hierarchy is established through vibrant color-blocking rather than traditional depth effects like shadows. The personality is optimistic, intellectual, and intentionally "un-corporate."

## Colors

The palette is anchored by a warm-white "Page Floor" (#fffaf0) and a high-contrast "Ink" (#0a0a0a). This foundation creates a sophisticated, paper-like quality that avoids the harshness of pure white/black.

### Palette Usage
- **Primary**: Used for core typography and primary interactive elements.
- **Secondary (Canvas)**: The default background for all page sections.
- **Saturated Feature Set**: A 6-color palette (Pink, Teal, Lavender, Peach, Ochre, Cream) used exclusively for high-impact feature cards and content blocks.
- **Ink Tiers**: Use `ink-muted` for secondary labels and metadata to maintain a soft hierarchy without losing legibility.
- **Status**: Standard success, warning, and error colors are used sparingly for functional feedback.

*Note: Dark footers are strictly avoided; keep the lower sections of the layout light and warm using `surface-soft` or the base canvas color.*

## Typography

The typography system relies on the contrast between the rounded, friendly character of **Be Vietnam Pro** (representing the "Plain Black" custom face) and the functional precision of **Inter**.

### Guidelines
- **Headlines**: Use Be Vietnam Pro at weight 500 only. Never use Bold or Heavy weights; the "rounded" personality is most effective when the strokes are consistent and not overly dense. Tight, negative letter-spacing is required for all headline levels.
- **Body & UI**: Inter handles all functional text. Use semi-bold (600) for titles and labels to ensure they stand out against the saturated card backgrounds.
- **Hierarchy**: Use `label-upper` for overlines and category badges to provide a structured, systematic contrast to the fluid headlines.

## Layout & Spacing

This design system uses a **Fluid Grid** model with a hard max-width of 1280px to maintain content density. The spacing logic is based on a 4px rhythm.

### Layout Rules
- **Grid**: A 12-column grid system is used for desktop. Feature sections typically use a 3-column or 2-column layout.
- **Margins & Gutters**: Standard gutters are set to 24px (lg). Page margins should be at least 32px (xl) on tablet and 16px (md) on mobile.
- **Sectioning**: Use generous vertical padding (`section`) to separate major brand narratives. Smaller `xl` padding is reserved for internal card spacing.
- **Mobile Reflow**: Feature grids collapse to a single column. Headlines must switch to their `-mobile` variants to maintain readability.

## Elevation & Depth

This design system deliberately avoids standard CSS box-shadows. Depth is achieved through **Tonal Layers** and **Chromatic Contrast**.

- **Surface Tiers**: Elements sit on the canvas and are distinguished by their fill color. 
- **Layering**: 3D assets (claymation figures) are the primary source of literal depth. These assets should overlap container boundaries to create a sense of three-dimensional space.
- **Focus States**: Depth for interactive elements (like inputs) is conveyed by thickening the border to 2px `primary-ink` rather than adding a glow or shadow.
- **Card Depth**: The "6-color saturated palette" provides enough visual weight that cards feel elevated simply by their color density against the cream canvas.

## Shapes

The shape language is organic and soft, mirroring the claymation assets.

- **Standard Elements**: Buttons and Input fields use a 12px radius (`rounded.md`).
- **Containers**: Content cards and pricing tiers use a 16px radius (`rounded-lg`).
- **Brand Hero Elements**: Feature cards and main CTA bands use a 24px radius (`rounded-xl`) to emphasize the playful, friendly nature of the brand.
- **Pills**: Use the `pill-shaped` (9999px) radius for status indicators, badges, and tag-like navigation elements.

## Components

### Buttons
- **Primary**: Solid `#0a0a0a` fill with white text. 12px rounded corners.
- **Secondary**: Transparent with a 1px `#e5e5e5` border, switching to a solid `#0a0a0a` border on hover.
- **Label**: 14px Inter Semi-bold.

### Feature Cards
- These are the heart of the design. Each should use one color from the 6-color saturated palette. 
- **Typography on Cards**: Use white text on Teal and Pink cards; use Ink text on Lavender, Peach, Ochre, and Cream cards.
- **Radius**: 24px (`rounded-xl`).
- **Internal Spacing**: 32px (`spacing.xl`).

### Inputs & Form Fields
- 1px hairline border (#e5e5e5) with a warm-tinted background (#faf5e8).
- 12px rounded corners.
- Focus state: 2px solid primary ink (#0a0a0a).

### List & Navigation
- Navigation items use 14px Inter Medium. No icons in the primary nav to keep it clean.
- Lists should use custom bullet points—ideally small colored circles from the brand palette—rather than standard browser bullets.

### Chips & Badges
- Small uppercase labels using the `label-upper` typography. 
- Full pill radius. 
- Backgrounds should use soft tints of the brand colors to avoid competing with primary CTA buttons.