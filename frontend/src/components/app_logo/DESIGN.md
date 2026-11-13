---
name: StudyBridge Elite
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#44474d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#75777e'
  outline-variant: '#c5c6ce'
  surface-tint: '#4e5f7e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#081b37'
  on-primary-container: '#7484a6'
  inverse-primary: '#b6c7eb'
  secondary: '#4e5f7e'
  on-secondary: '#ffffff'
  secondary-container: '#cadaff'
  on-secondary-container: '#4f5f7f'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#00201d'
  on-tertiary-container: '#009489'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e3ff'
  primary-fixed-dim: '#b6c7eb'
  on-primary-fixed: '#081b37'
  on-primary-fixed-variant: '#364765'
  secondary-fixed: '#d7e2ff'
  secondary-fixed-dim: '#b6c7eb'
  on-secondary-fixed: '#081b38'
  on-secondary-fixed-variant: '#374765'
  tertiary-fixed: '#84f5e8'
  tertiary-fixed-dim: '#66d9cc'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  deep-navy: '#1a2b48'
  accent-teal: '#26a69a'
  soft-slate: '#64748b'
  surface-ice: '#f8f9ff'
  border-subtle: '#c5c6ce'
  warning-amber: '#f59e0b'
typography:
  display-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '800'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: 0.15em
  button-text:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  display-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  section-gap: 3rem
  container-padding: 1.5rem
  item-gap: 1rem
  input-padding-y: 1rem
  input-padding-x: 1.25rem
---

## Brand & Style
The brand personality is **academic, premium, and visionary**. It targets ambitious students and parents seeking a reliable, high-end educational journey. The visual style is **Corporate Modern with Glassmorphic accents**, blending the stability of a traditional institution with the innovative feel of a modern ed-tech platform.

The UI evokes an emotional response of clarity and confidence through the use of deep navy tones, vibrant teal accents, and generous whitespace. Subtle glass effects on floating elements (like the navigation dock) add a layer of sophistication and depth without compromising professional integrity.

## Colors
The palette is anchored by **Deep Navy (#1a2b48)**, representing authority and depth. **Accent Teal (#26a69a)** is used strategically for primary actions, success states, and highlighting the "perfect path," providing a fresh, optimistic contrast.

Backgrounds utilize **Surface Ice (#f8f9ff)** and tiered containers of blue-greys to maintain a cool, clean environment. Interactive secondary elements use **Soft Slate (#64748b)** for labels and icons to ensure a clear hierarchy against the high-contrast primary text.

## Typography
We use **Plus Jakarta Sans** exclusively across all levels to maintain a friendly yet professional geometric appearance. 

The typographic system relies on heavy weights (Bold/ExtraBold) for headlines to create a strong "editorial" feel. Display sizes use tight letter-spacing to appear more cohesive at large scales. Small labels utilize wide letter-spacing and uppercase styling to ensure legibility and a sense of premium detail. Body copy is kept at a comfortable 14px for density without sacrificing readability on mobile devices.

## Layout & Spacing
The system utilizes a **Fixed Grid** approach for large screens (max 1280px) and a **Fluid Grid** for mobile devices. 

- **Mobile:** 1.5rem (24px) side margins are standard. Vertical section spacing is a generous 3rem (48px) to allow content to breathe.
- **Grids:** Use a 2-column bento-style grid for features and a horizontal scrolling "carousel" for cards to maximize space on smaller screens.
- **Rhythm:** Spacing follows a 4px/8px baseline, with 16px (1rem) being the standard gap for related elements.

## Elevation & Depth
Depth is created through three distinct methods:
1.  **Tonal Stacking:** Using slightly different shades of background (e.g., `surface-ice` to `surface-container-low`) to define distinct content areas without hard borders.
2.  **Ambient Shadows:** Cards use `shadow-sm` (low-offset, soft blur) for a lifted-flat look. Interactive states or primary modals use `shadow-xl` or `shadow-2xl` for significant depth.
3.  **Glassmorphism:** The "Floating Action Dock" uses a white semi-transparent background (70% opacity) with a 10px backdrop blur and a thin, low-opacity white border to appear as if it is floating above the content.

## Shapes
The design uses a **Rounded (Level 2)** shape language to reinforce the approachable brand identity. 
- **Standard Cards:** 1rem (16px) radius.
- **Large Sections/Institutional Cards:** 1.5rem (24px) to 2rem (32px) radius for a modern, oversized aesthetic.
- **Buttons & Search Bars:** Mix of 0.75rem (12px) for structural buttons and Full-Pill for category filters and navigation items.
- **Action Dock:** 1.5rem (24px) to match the larger card radii.

## Components
- **Buttons:** 
    - *Primary:* Filled `deep-navy` with white text, 12px uppercase tracking.
    - *Secondary:* Outlined with `deep-navy` border, bold weight.
    - *Action:* Small `accent-teal` tags for "HOT" or "NEW" labels.
- **Chips/Filters:** Pill-shaped, using white backgrounds with `border-subtle` or filled `deep-navy` for active states.
- **Inputs:** Large, 1rem vertical padding, featuring leading icons in `soft-slate` and an `outline-variant` border that transitions to `accent-teal` on focus.
- **Cards:** White backgrounds with subtle borders. University cards should feature an aspect ratio of 16:10 for images.
- **Floating Action Dock:** A 3-section bottom nav with a centered, elevated primary action button (`Exams`) that sits 24px higher than the dock itself.
- **Timeline:** Vertical line in `border-subtle`, with icons in circular containers at each node.