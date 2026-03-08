

## Plan: Modern Dark Theme Landing Page Background

### Approach
Add layered ambient depth to the landing page dark mode — radial gradient orbs, subtle grid texture, soft glow behind hero, and thin glowing section dividers. All using CSS only (no JS animations), dark-mode-only via `dark:` classes.

### Changes

**1. `src/pages/LandingPage.tsx`** — Add global ambient background layer:
- Fixed overlay with 2-3 large, blurred radial gradient orbs (primary at ~5%, purple at ~3%, blue at ~3%)
- Only visible in dark mode (`hidden dark:block`)

**2. `src/components/landing/HeroSection.tsx`** — Enhanced hero atmosphere:
- Replace existing grid with a lower-opacity dark-mode grid (`dark:` variant)
- Add a centered radial glow behind the hero content (primary color, very soft ~8% opacity, large blur)
- Change `border-b border-border/40` to a thin glowing divider: `dark:border-primary/10 dark:shadow-[0_1px_0_0_hsl(var(--primary)/0.08)]`

**3. All section components** — Glowing dividers instead of flat borders:
- `ProblemSection`, `SolutionSection`, `FeaturesSection`, `HowItWorksSection`, `TrustSection`, `ResourcesSection`: Replace `border-b border-border/40` with `border-b border-border/40 dark:border-white/[0.06]`
- Sections with `bg-muted/20` get `dark:bg-white/[0.02]` for subtle surface differentiation
- Cards get `dark:bg-white/[0.03] dark:border-white/[0.06]` for elevated surfaces

**4. `src/components/landing/FinalCTASection.tsx`** — Add subtle radial glow behind CTA

**5. `src/components/landing/LandingFooter.tsx`** — Subtle top glow border

**6. `src/components/landing/LandingNav.tsx`** — Thin bottom glow: `dark:border-white/[0.06]`

### Design Tokens (Dark Mode Only)
- Ambient orbs: `bg-red-500/[0.04]`, `bg-purple-500/[0.03]`, `bg-blue-500/[0.03]` with `blur-[150px]`
- Hero glow: `bg-primary/[0.06]` with `blur-[120px]`
- Section borders: `dark:border-white/[0.06]` (replaces `border-border/40`)
- Card surfaces: `dark:bg-white/[0.03]`
- Alternating section backgrounds: `dark:bg-white/[0.02]`

Light mode remains completely unchanged.

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/LandingPage.tsx` | Add ambient gradient overlay |
| `src/components/landing/HeroSection.tsx` | Radial glow + enhanced grid |
| `src/components/landing/ProblemSection.tsx` | Dark card surfaces + glow border |
| `src/components/landing/SolutionSection.tsx` | Dark surfaces + glow border |
| `src/components/landing/FeaturesSection.tsx` | Dark card surfaces + glow border |
| `src/components/landing/HowItWorksSection.tsx` | Dark surfaces + glow border |
| `src/components/landing/TrustSection.tsx` | Dark card surfaces + glow border |
| `src/components/landing/ResourcesSection.tsx` | Dark surfaces + glow border |
| `src/components/landing/FinalCTASection.tsx` | Radial glow behind CTA |
| `src/components/landing/LandingFooter.tsx` | Glow top border |
| `src/components/landing/LandingNav.tsx` | Glow bottom border |

