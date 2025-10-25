# Norrland Design System – Design Tokens

This document describes the token-based design system for the Norrland compliance platform. All visual styling is driven by semantic tokens that automatically adapt to light and dark modes.

## 🧭 Token Architecture

The token system follows a three-layer hierarchy:

1. **Base Tokens** – Raw HSL values defined in `src/index.css`
2. **Semantic Tokens** – Mapped to Tailwind utilities in `tailwind.config.ts`
3. **Component Usage** – Applied via semantic classes in React components

This structure ensures:
- Centralized theme management
- Automatic dark mode switching
- Consistent visual language across the application
- Easy maintenance and updates

---

## 🎨 Token Reference

### Surface Tokens
Used for backgrounds, cards, and containers.

| Token | Light Mode | Dark Mode | Tailwind Class | Usage |
|-------|-----------|-----------|----------------|-------|
| `--surface-1` | `0 0% 100%` (white) | `222 47% 15%` (dark card) | `bg-surface-1` | Cards, modal backgrounds |
| `--surface-2` | `120 14% 97%` (off-white) | `222 47% 11%` (page bg) | `bg-surface-2` | Page backgrounds |
| `--surface-3` | `220 14% 96%` (light gray) | `222 47% 18%` (hover) | `bg-surface-3` | Hover states, secondary surfaces |

### Text Tokens
Used for all typography.

| Token | Light Mode | Dark Mode | Tailwind Class | Usage |
|-------|-----------|-----------|----------------|-------|
| `--text-primary` | `222 47% 11%` (dark blue) | `210 40% 98%` (near white) | `text-text-primary` | Headings, primary text |
| `--text-secondary` | `215 16% 47%` (muted gray) | `215 20% 65%` (light gray) | `text-text-secondary` | Body text, descriptions |

### Border Tokens
Used for dividers and component borders.

| Token | Light Mode | Dark Mode | Tailwind Class | Usage |
|-------|-----------|-----------|----------------|-------|
| `--border-muted` | `220 13% 91%` (light border) | `222 47% 18%` (dark border) | `border-border-muted` | Subtle dividers, card borders |
| `--border` | `220 13% 91%` | `222 47% 18%` | `border` | Standard borders |

### Brand & Action Tokens
Core brand colors for CTAs and key UI elements.

| Token | Value (Light/Dark) | Tailwind Class | Usage |
|-------|-------------------|----------------|-------|
| `--primary` | `176 57% 13%` | `bg-primary`, `text-primary` | Primary buttons, key actions |
| `--primary-foreground` | `0 0% 100%` | `text-primary-foreground` | Text on primary backgrounds |
| `--primary-glow` | `182 22% 60%` | `bg-primary-glow` | Accent highlights, hover effects |
| `--accent` | `182 22% 60%` | `bg-accent`, `text-accent` | Secondary actions, badges |

### State Tokens
For warnings, errors, and success states.

| Token | Tailwind Class | Usage |
|-------|----------------|-------|
| `--destructive` | `bg-destructive`, `text-destructive` | Error states, delete actions |
| `--warning` | `bg-warning`, `text-warning` | Warning messages |
| `--muted` | `bg-muted`, `text-muted-foreground` | Disabled states, subtle text |

---

## 🌗 Dark Mode Behavior

Dark mode is activated by adding the `.dark` class to the root `<html>` element. All tokens automatically switch to their dark variants defined in `src/index.css`:

```css
.dark {
  --surface-1: 222 47% 15%;
  --surface-2: 222 47% 11%;
  --text-primary: 210 40% 98%;
  /* ... */
}
```

The application uses `next-themes` or a similar solution to manage the dark mode toggle persistently.

---

## 🧩 Usage Examples

### Cards with Hover States
```tsx
<div className="bg-surface-1 border border-border-muted rounded-2xl p-6 hover:bg-surface-3 transition">
  <h3 className="text-text-primary font-semibold">Card Title</h3>
  <p className="text-text-secondary">Card description text</p>
</div>
```

### Primary Action Button
```tsx
<button className="bg-primary text-primary-foreground px-5 py-3 rounded-2xl hover:brightness-105 transition">
  Start Demo
</button>
```

### Secondary Button
```tsx
<a className="border border-border-muted bg-surface-1 text-text-primary px-5 py-3 rounded-2xl hover:bg-surface-3 transition">
  Learn More
</a>
```

### Text Hierarchy
```tsx
<div>
  <h1 className="text-text-primary text-3xl font-semibold">Heading</h1>
  <p className="text-text-secondary text-sm">Supporting text</p>
</div>
```

---

## 🧱 Integration Notes

### Tailwind Configuration
Semantic tokens are mapped in `tailwind.config.ts`:

```typescript
colors: {
  surface: {
    1: "hsl(var(--surface-1))",
    2: "hsl(var(--surface-2))",
    3: "hsl(var(--surface-3))",
  },
  text: {
    primary: "hsl(var(--text-primary))",
    secondary: "hsl(var(--text-secondary))",
  },
  'border-muted': "hsl(var(--border-muted))",
}
```

### CSS Variable Definition
All tokens are defined in `src/index.css` using HSL values (no `hsl()` wrapper):

```css
:root {
  --surface-1: 0 0% 100%;
  --text-primary: 222 47% 11%;
  /* ... */
}
```

### Why HSL?
- **Easier manipulation** – adjust lightness/saturation independently
- **Better alpha support** – `bg-primary/20` works seamlessly
- **Gradual color shifts** – smooth dark mode transitions

### Figma Sync (Optional)
For design-dev parity, export these tokens to Figma using:
- **Figma Tokens** plugin
- **Style Dictionary** for automated token generation

---

## 📋 Best Practices

1. **Never use hardcoded colors** – Always use semantic tokens
2. **Prefer semantic over arbitrary** – Use `bg-surface-1` instead of `bg-[hsl(var(--surface-1))]`
3. **Test in both modes** – Verify all components in light and dark themes
4. **Document new tokens** – Update this file when adding new semantic tokens
5. **Use alpha channels sparingly** – Only for intentional transparency (e.g., `bg-primary/10` for subtle overlays)

---

## 🔄 Updating Tokens

To add or modify tokens:

1. **Add base token** in `src/index.css` (both `:root` and `.dark`)
2. **Map to Tailwind** in `tailwind.config.ts` under `theme.extend.colors`
3. **Document here** with usage examples and semantic meaning
4. **Test thoroughly** in both light and dark modes

---

## 📚 Additional Resources

- [Tailwind CSS Custom Colors](https://tailwindcss.com/docs/customizing-colors)
- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Design Tokens W3C Community Group](https://www.w3.org/community/design-tokens/)

---

**Last updated:** 2025
**Maintained by:** Norrland Development Team
