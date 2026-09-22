---
name: Warm Horizon Analytics
colors:
  surface: '#fff8f5'
  surface-dim: '#e2d8d2'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fcf2eb'
  surface-container: '#f6ece6'
  surface-container-high: '#f0e6e0'
  surface-container-highest: '#eae1da'
  on-surface: '#1f1b17'
  on-surface-variant: '#584237'
  inverse-surface: '#342f2b'
  inverse-on-surface: '#f9efe8'
  outline: '#8c7164'
  outline-variant: '#e0c0b1'
  surface-tint: '#9d4300'
  primary: '#9d4300'
  on-primary: '#ffffff'
  primary-container: '#f97316'
  on-primary-container: '#582200'
  inverse-primary: '#ffb690'
  secondary: '#ac3400'
  on-secondary: '#ffffff'
  secondary-container: '#fd6b36'
  on-secondary-container: '#5d1900'
  tertiary: '#795900'
  on-tertiary: '#ffffff'
  tertiary-container: '#c49200'
  on-tertiary-container: '#422f00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb690'
  on-primary-fixed: '#341100'
  on-primary-fixed-variant: '#783200'
  secondary-fixed: '#ffdbd0'
  secondary-fixed-dim: '#ffb59d'
  on-secondary-fixed: '#390c00'
  on-secondary-fixed-variant: '#832600'
  tertiary-fixed: '#ffdf9f'
  tertiary-fixed-dim: '#f9bd22'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#fff8f5'
  on-background: '#1f1b17'
  surface-variant: '#eae1da'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers a refined, high-density Web3 intelligence and analytics environment. Escaping the generic dark-neon clichés of decentralized finance, it embraces a radiant, desert-dawn aesthetic that merges financial rigor with warmth, clarity, and optimism. 

The visual identity targets institutional investors, protocol architects, and on-chain researchers who require immense data clarity without visual fatigue. The design style blends modern institutional minimalism with subtle atmospheric warmth: clean alabaster surfaces, micro-textured borders, luminous desert dune gradients, and precise data visualizations. The interface conveys supreme algorithmic precision while feeling tactile, human, and inviting.

## Colors

The color palette is anchored in an earthy, energetic spectrum ranging from solar amber to deep terracotta, balanced over pristine warm-stone backgrounds.

- **Primary (`#F97316` / Sunset Orange):** Serves as the primary operational hue, driving core interactive triggers, focus outlines, high-priority trend lines, and critical data nodes.
- **Secondary (`#C2410C` / Deep Terracotta):** Anchors visual hierarchy, giving weight to secondary actions, active navigation states, chart boundaries, and high-impact metric counters.
- **Tertiary (`#FBBF24` / Warm Amber):** Denotes mid-tier ratings, growth inflection points, and accent glows across area charts and rating star clusters.
- **Surface & Backgrounds:** The foundation is built upon Warm Canvas (`#FAFAF9`) and Pure Alabaster (`#FFFFFF`). Card surfaces use pure white to pop crisply over the subtle stone-tinted backdrop.
- **Gradients:** Hero card headers and chart fills employ atmospheric desert gradients transitioning from `#FFEDD5` (Warm Cream Tint) down to transparent `#FAFAF9`, evoking sunlit sand dunes and topographical terrain.
- **Functional Semantics:** Positive delta metrics utilize Forest Emerald (`#10B981`), critical warnings use Coral Red (`#EF4444`), while neutral trends leverage Warm Slate (`#78716C`).

## Typography

The typographic hierarchy harmonizes geometric legibility with technical precision:

- **Primary Interface Typeface (`Plus Jakarta Sans`):** Selected for its crisp geometric letterforms, open apertures, and contemporary polish. It establishes an approachable yet authoritative tone across brand headers, page titles, navigation, and contextual copy.
- **Data & Metric Typeface (`JetBrains Mono`):** Applied strictly to tabular numerals, transaction hashes, smart-contract identifiers, percentage deltas, index rankings, and timeline labels. Its strict proportional alignment prevents layout shifts during live data polling.
- **Hierarchy & Tracking:** Display headings feature tight letter spacing (`-0.02em`) for cohesion, while all monospace data labels carry positive tracking (`+0.01em` to `+0.03em`) to enhance scan-speed in dense analytical panels.

## Layout & Spacing

This design system uses a responsive 12-column analytical grid that balances maximum dashboard visibility with breathing space.

- **Grid Architecture:** Desktop displays feature a persistent, compact left navigation sidebar (240px wide) alongside a fluid 12-column content plane. Tablet layouts collapse the sidebar into a high-density icon rail (68px wide) over an 8-column layout. Mobile screens adopt a single-column reflow (4 columns) with a top sticky navigation header and bottom utility drawer.
- **Spacing Rhythm:** Built strictly on an 8pt base grid (with a 4pt sub-unit for tight micro-alignments like badges and sparklines). Dashboard cards maintain internal padding of `1.25rem` (`space-lg`), while metric groupings leverage `0.75rem` (`space-md`) gaps.
- **Reflow & Density Rules:** Multi-column metric displays (e.g., Popularity Index alongside Health Index) sit side-by-side on viewport widths above 1024px and stack vertically beneath that threshold to guarantee line-chart readability.

## Elevation & Depth

Visual hierarchy avoids excessive drop shadows, favoring tonal layering, warm ambient reflections, and hairline outlines:

- **Layer 0 (Canvas Base):** Grounded at `#FAFAF9`. Completely flat and non-reflective.
- **Layer 1 (Card & Module Surfaces):** Rendered in `#FFFFFF` with a crisp border: `1px solid #F5F5F4`. Supported by an ultra-soft, warm ambient shadow: `0 1px 3px rgba(120, 113, 108, 0.04), 0 6px 16px -4px rgba(249, 115, 22, 0.05)`.
- **Layer 2 (Hero & Gradient Focus Panels):** Surfaces with decorative warmth feature soft linear gradients (`linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 70%)`) and an inner hairline: `inset 0 1px 0 rgba(255, 255, 255, 0.9)`.
- **Layer 3 (Floating Controls, Menus & Tooltips):** Popovers, dropdown menus, and hover tooltips on chart data points sit elevated with: `0 10px 25px -5px rgba(120, 113, 108, 0.1), 0 8px 10px -6px rgba(249, 115, 22, 0.04)` bordered by `1px solid #E7E5E4`.
- **Hover Transitions:** Hovered cards elevate by `1px` alongside an increase in border glow: `border-color: #FDBA74`.

## Shapes

The design system employs a refined geometric curve strategy (`roundedness: 2`) that prevents sterile boxiness while maintaining structured precision.

- **Base Radius (0.5rem / 8px):** Standard for form inputs, interactive segmented controllers, data chips, and table row groupings.
- **Medium Radius (0.75rem / 12px):** Applied to nested metric containers, chart sub-panels, and standard analytics cards.
- **Large Radius (1rem / 16px):** Reserved for primary layout panels, hero banner cards, and global dialog modals.
- **Full Pill Radius (9999px):** Applied to live-status badges (e.g., "Active", "Rank #1"), search pills, category chips, and segmented chart range switchers (1D, 7D, 1M, ALL).

## Components

### Buttons
- **Primary:** Background in `#F97316` with text in `#FFFFFF`, featuring a subtle gradient reflection on top. Hover state transitions to `#EA580C` with an ambient glow (`box-shadow: 0 4px 14px rgba(249, 115, 22, 0.3)`).
- **Secondary / Ghost:** White surface with `#E7E5E4` border and `#44403C` text. Hover shifts to `#FFF7ED` surface with `#F97316` text and `#FDBA74` border.
- **Pill Switchers:** Compact segmented buttons for chart intervals (1H, 24H, 7D, 30D, 1Y). Active state features pure white surface with subtle shadow and orange label text.

### Data Chips & Badges
- **Status Chips:** Full pill contour with light tinted backgrounds (e.g., `#FFEDD5` for primary status, `#DCFCE7` for positive delta) paired with a 6px solid pulsing indicator dot.
- **Contract & Protocol Tags:** Neutral gray background (`#F5F5F4`) with monospace text (`JetBrains Mono`, 11px), accompanied by a micro copy-icon on hover.

### Analytics Cards & Hero Panels
- **Structure:** Clean white or gradient canvas framed with a `1px` border (`#F5F5F4`).
- **Header:** Features bold title, secondary info tooltip icon, and right-aligned actions or export triggers.
- **Dune Gradient Banners:** Curated analytics modules incorporate low-contrast background illustrations featuring stylized terracotta and amber desert ridges with smooth 15% opacity fills.

### Area & Sparkline Charts
- **Fills:** Linear gradients starting from `#F97316` at 35% opacity at the top trend peak, fading seamlessly to 0% opacity near the X-axis baseline.
- **Stroke:** Crisp 2px stroke in `#EA580C` or `#F97316`.
- **Data Crosshair Tooltips:** Minimal floating pill displaying timestamp and raw metric in `JetBrains Mono` with an orange pointer node.

### Metric Index Visualizers
- **Score Gauges & Index Scales:** Segmented color-block meters (red-orange to amber to green) visually displaying health and popularity indexes (e.g., 0–100 scale), paired with oversized bold metrics (`Plus Jakarta Sans`, 28px/700) and delta indicators.
- **Distribution Progress Bars:** Multi-step horizontal bar graphs in warm amber (`#FBBF24`) against soft track backgrounds (`#F5F5F4`) for rating breakdowns.

### Input Fields & Search
- **Search Bar:** Pill or soft-corner input with an integrated search icon, light warm surface (`#F5F5F4`), transitioning on focus to pure `#FFFFFF` with a `1.5px` border in `#F97316` and a soft orange halo.