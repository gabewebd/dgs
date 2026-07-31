# Design System: Digital GrowthScale (DGS)

This document serves as the master design system and consistency guidelines for the Digital GrowthScale website. All frontend components, templates, and layouts must adhere strictly to these rules.

---

## 1. Visual Theme & Atmosphere
The design system reflects an **AI-first and business-first** consultancy. The interface is clinical yet warm—combining high-tech capability with practical corporate credibility.
* **Atmosphere:** Confident, practical, executive, human-centered.
* **Visual Density:** Daily App Balanced (4–6) for public/marketing pages, scaling to Cockpit Dense (8) for interactive dashboards and tool outputs.
* **Layout Variance:** Asymmetric and offset (Variance Score: 8). Symmetric layouts are avoided.
* **Motion Intensity:** Fluid CSS & SVG canvas animation (Motion Score: 6), focusing on network nodes and spring physics.

---

## 2. Color Palette & Roles
The color palette uses strict ratios to maintain visual hierarchy, contrast, and accessibility.

| Color Name | Hex Code | Usage Ratio | Functional Role / Application |
| :--- | :--- | :--- | :--- |
| **Deep Navy** | `#0A1F33` | 60% | Primary background surface, headers, hero section backgrounds, footer background, primary text on light backgrounds |
| **Growth Teal** | `#00B39F` | 15% | Brand accent: links, highlights, progress indicators, focus rings, Transform pillar branding |
| **Electric Blue** | `#2D7FF9` | 10% | Secondary accent: data visualizations, Enable pillar branding, active hover states |
| **Signal Amber** | `#F5A623` | 5% | **Conversion only**: Primary CTA button fills, Elevate pillar branding, system alerts |
| **Mist** | `#F0F4F8` | 8% | Secondary section backgrounds, light cards, alternating page bands |
| **Slate** | `#64748B` | 2% | Secondary text, captions, structural borders, dividers |
| **Pure White** | `#FFFFFF` | — | Card containers, light section backgrounds |
| **Off-Black** | `#09090B` | — | Primary text on light surfaces |

### Color Rules & Accessibility
* **No Pure Black:** Never use `#000000` for text or overlays. Use **Deep Navy** (`#0A1F33`) or a custom Off-Black/Charcoal.
* **Text Contrast:** Body copy must be Deep Navy (`#0A1F33`) or Slate (`#64748B`) on White/Mist backgrounds. Never use Teal (`#00B39F`) for body copy or paragraphs.
* **Accessibility Target:** All text/background pairs must pass WCAG AA (4.5:1 ratio). White text on Growth Teal (`#00B39F`) is restricted to bold text at 14pt (18.66px) and above.
* **Amber Usage:** Signal Amber (`#F5A623`) is strictly reserved for the two global conversion CTAs.

---

## 3. Typography Rules
Typography is clean, highly structured, and designed for scannability by busy executives.

* **Display / Hero Headlines:**
  * **Font Family:** `Sora` (Bold)
  * **Size & Line Height:** `56px / 64px` (3.5rem / 4rem)
  * **Tracking/Letter Spacing:** `-1%`
* **H1 (Page Title):**
  * **Font Family:** `Sora` (Bold)
  * **Size & Line Height:** `40px / 48px` (2.5rem / 3rem)
* **H2 (Section Heading):**
  * **Font Family:** `Sora` (Semibold)
  * **Size & Line Height:** `28px / 36px` (1.75rem / 2.25rem)
* **H3 / Card Titles:**
  * **Font Family:** `Inter` (Bold)
  * **Size & Line Height:** `18px / 26px` (1.125rem / 1.625rem)
* **Body Text:**
  * **Font Family:** `Inter` (Regular)
  * **Size & Line Height:** `16px / 26px` (1rem / 1.625rem)
  * **Constraints:** Max line width of `68ch` for readability.
* **Caption / Label:**
  * **Font Family:** `Inter` (Semibold)
  * **Size & Line Height:** `12px / 16px` (0.75rem / 1rem)
  * **Case & Tracking:** UPPERCASE, `+8%` tracking
* **Font Fallbacks:** `Helvetica`, `Arial`, sans-serif.

---

## 4. Component Stylings

### Buttons
All buttons have a height of `48px` on desktop and `44px` on mobile, with a pill border-radius of `999px`.
* **Primary CTA Button:**
  * **Style:** Solid Signal Amber (`#F5A623`) background, Deep Navy (`#0A1F33`) text.
  * **Hover Interaction:** Darken background by 8%, translate `-2px` vertically (visual lift).
  * **Active state:** Translate `+1px` vertically (tactile push feedback).
* **Secondary CTA Button:**
  * **Style:** Outline stroke in Deep Navy (`#0A1F33`) or White (on dark backgrounds), transparent background.
  * **Hover Interaction:** Translate `-2px` vertically, transition border color and text to Growth Teal or light accent.
* **Tertiary Link:**
  * **Style:** Growth Teal (`#00B39F`) text link with an inline arrow (`→`).

### Cards
* **Challenge Chips:** Interactive tags. On click, they expand dynamically to reveal their mapped capability and operational solution.
* **Promise Cards:** Solid Deep Navy (`#0A1F33`) background with a 1px border. Hover lifts the card and transitions the border/edge to Growth Teal (`#00B39F`), revealing the underlying service pillar.
* **Industry Cards:** Light Mist (`#F0F4F8`) background, containing an icon, industry name, and a one-line pain point. Links directly to the industry-specific solution selector page.
* **General Card Aesthetics:** Generously rounded corners (radius up to `2.5rem` / `40px` for large containers). Soft, diffused shadows tinted with the background hue (no harsh black shadows). For high-density areas, replace card containers with clean, thin Slate (`#64748B`) top-border dividers.

### Forms & Interactive Inputs
* **Progressive Disclosure:** Maximum 4 visible input fields before prompting the user for more steps.
* **Layout:** Field label must sit directly above the input, with any validation/error messages positioned below.
* **Input Styling:** Height `48px`, font size `16px` (`Inter`), 1px Slate border. On focus, apply a Growth Teal (`#00B39F`) border/focus ring.
* **Multi-Step Forms:** Assessments and audits must display a progressive progress bar in Growth Teal (`#00B39F`).
* **Webhooks:** All forms post to GoHighLevel webhooks with appropriate hidden tracking fields (e.g., `inquiry_type`).

### Loaders & Feedback
* **Loaders:** Use skeletal shimmer states matching the exact layout dimensions. Do not use generic infinite circular spinning wheels.
* **Empty States:** Custom illustrations or structured guidance compositions indicating what data goes there.
* **Errors:** Clear, inline error text in high-contrast red/amber alert states below the respective input field.

---

## 5. Layout & Grid Principles
* **Grid System:** CSS Grid-first responsive design. Avoid flexbox percentage hacks.
* **Containment:** Main page wrapper constrained to a maximum width of `1400px` and centered on the viewport.
* **Asymmetry:** Centered hero layouts are banned. Use asymmetric layouts: Left-aligned content, split-screen layouts, or offset grids.
* **Grid Formats:**
  * The generic "3 equal horizontal cards" layout is banned.
  * Use 2-column zig-zag structures, asymmetric bento grids (e.g., one double-wide card, two small ones), or horizontal swipe lists on mobile viewports.
* **Section Spacing:** Generous and responsive padding gaps between sections using CSS clamp:
  ```css
  padding-block: clamp(3rem, 8vw, 6rem);
  ```
* **Full-Height Sections:** Force layouts using `min-h-[100dvh]` to prevent layout shifts on mobile browsers. Never use `height: 100vh`.

---

## 6. Motion & Interaction
* **Spring Physics:** Use natural spring transitions for interactive hover/active states.
  * *Default Preset:* `stiffness: 100`, `damping: 20` (gives a premium, weighted mechanical feel). Avoid linear or robotic ease-in-out curves.
* **Node Networks:** The Hero background contains a slow, ambient animation of connected capability nodes cycling through:
  `AI ➔ CRM ➔ Operations ➔ Workforce ➔ Analytics`
* **Micro-interactions:** Any active dashboard component must feature subtle loop states (e.g., pulse indicators, delicate shimmers).
* **Orchestration:** Avoid mounting lists or grids simultaneously. Use staggered cascade delays (e.g., 50ms per item) to reveal content sequentially.
* **Hardware Acceleration:** Limit transitions to `transform` and `opacity` to avoid layout thrashing and maintain a steady 60fps.

---

## 7. Responsive & Mobile Strategy
* **Mobile-First Collapse:** All multi-column layouts must collapse to a single column at viewports `< 768px`.
* **Zero Horizontal Scroll:** A strict ban on horizontal overflow.
* **Text Scaling:** Scale typography smoothly between desktop and mobile break points using clamp:
  ```css
  font-size: clamp(2rem, 5vw, 3.5rem);
  ```
  *Mobile body text must never scale below `16px` (`1rem`).*
* **Touch Targets:** Minimum tap target area of `44px` for all links, buttons, and chips.
* **Navigation:** Collapse the primary desktop header layout into a full-screen drawer or slide-out menu on mobile viewports.

---

## 8. Anti-Patterns (Banned AI Clichés)
To maintain a high-agency, professional developer look, the following elements are strictly forbidden:

* **No Emojis:** Never use emojis in headings, body copy, tooltips, or buttons.
* **No `Inter` as Display Font:** Inter is reserved for body text and UI labels. Headings must use `Sora`.
* **No Glows/Neons:** Banish all neon outer glows, floating purple drop-shadows, and AI-like gradient borders.
* **No Text Gradients:** Avoid heavy, multi-stop gradient fills on headings. Solid colors or high-contrast duotones only.
* **No Custom Mouse Cursors:** Stick to default system cursor behaviors.
* **No 3-Column Equal Grids:** Replace with asymmetric grid layouts.
* **No AI Copywriting Slop:** Never use terms like: *"Elevate"*, *"Seamless"*, *"Unleash"*, *"Next-Gen"*, *"Empower"*, *"Harness"*, or *"Revolutionize"*. Keep copywriting simple, plain, and metric-focused.
* **No Bouncing Chevrons:** Banish arrows saying "Scroll down to explore". Let the layout and visual flow do the work.
* **No Placeholder/Acme Names:** Do not use placeholder data like "John Doe" or "Acme Corp". Use realistic, context-appropriate client profiles.
* **No Broken Media Links:** Avoid broken stock imagery. Use structured line icons or duotone assets.
