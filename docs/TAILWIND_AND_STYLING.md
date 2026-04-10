# Tailwind and Styling in Finnova

A beginner-friendly tour of how CSS works in this project. By the end you should be able to open any component, read the `className` strings, and know exactly what they do.

This project uses **Tailwind CSS v4**. It is different from the v3 tutorials you will find online, so read this before you go searching elsewhere.

---

## 1. What Tailwind Is

Tailwind is a **utility-first** CSS framework. Instead of writing a stylesheet like this:

```css
.btn {
  padding: 1rem;
  background: blue;
  border-radius: 8px;
}
```

You apply tiny, single-purpose classes directly in your JSX:

```tsx
<button className="p-4 bg-blue-500 rounded-lg">Click me</button>
```

Each class does one thing. `p-4` is padding. `bg-blue-500` is a background color. `rounded-lg` is a border radius. You compose them together like LEGO.

**Why people like it:**

- No more inventing class names (`.btn-primary-large-outlined-v2`).
- No unused CSS. If you never use `p-8`, Tailwind never ships it.
- Design tokens are baked in. Everyone uses the same spacing scale, the same colors, the same shadows.
- You can read a component and understand how it looks without jumping to a separate CSS file.

**The tradeoff:** class strings get long. When they do, you extract the pattern into a component. That is exactly what `Card` and `Button` in this project do.

---

## 2. How Tailwind v4 Is Set Up Here

Tailwind v4 is a big departure from v3. Here is what matters:

1. **No `tailwind.config.js` or `tailwind.config.ts`.** v4 configures itself from CSS. Go look in the repo root — you will not find a tailwind config file. That is on purpose.
2. **PostCSS plugin.** Tailwind runs as a PostCSS plugin. The entire config in `postcss.config.mjs` is:

   ```js
   const config = {
     plugins: {
       "@tailwindcss/postcss": {},
     },
   };

   export default config;
   ```

3. **Your CSS file is the config.** Open `app/globals.css`. The very first line is:

   ```css
   @import "tailwindcss";
   ```

   That single import pulls in everything Tailwind normally adds (reset, utilities, etc.). Below that, the file defines custom design tokens inside a `@theme inline { ... }` block and a `:root { ... }` block. Those tokens then become Tailwind classes automatically.

4. **Versions.** From `package.json`:

   ```json
   "tailwindcss": "^4",
   "@tailwindcss/postcss": "^4"
   ```

That is the whole setup. No JS config, no content globs, no safelist. The plugin scans your files automatically.

---

## 3. The Design Token System

Open `app/globals.css`. You will see two big blocks at the top.

### 3a. The raw CSS variables (`:root`)

The `:root { ... }` block defines the theme values as CSS custom properties. A sample from the light theme:

```css
:root {
  --background: oklch(98.5% 0.012 160);
  --foreground: oklch(18% 0.03 170);
  --surface: oklch(100% 0 0);
  --surface-strong: oklch(96% 0.015 165);
  --surface-elevated: oklch(99% 0.008 160);
  --border: oklch(90% 0.015 165);
  --border-strong: oklch(84% 0.02 165);
  --muted: oklch(94% 0.012 165);
  --muted-foreground: oklch(45% 0.015 170);
  --primary: oklch(62% 0.15 165);
  --primary-foreground: oklch(99% 0 0);
  --primary-soft: oklch(92% 0.06 165);
  --accent: oklch(60% 0.19 295);
  --accent-foreground: oklch(99% 0 0);
  --accent-soft: oklch(93% 0.06 295);
  --success: oklch(68% 0.17 155);
  --warning: oklch(78% 0.16 75);
  --danger: oklch(63% 0.22 25);
  --ring: oklch(62% 0.15 165);
  --shadow-sm: 0 1px 2px 0 rgba(15, 32, 27, 0.05);
  --shadow-md: 0 8px 24px -12px rgba(15, 32, 27, 0.18);
  --shadow-lg: 0 20px 50px -20px rgba(15, 32, 27, 0.25);
  --shadow-glow: 0 8px 30px -8px color-mix(in oklab, var(--primary) 45%, transparent);
  --ease-spring: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
```

(`oklch(...)` is a modern color format. Do not worry about the math — just know they are colors.)

### 3b. The `@theme inline` block

Below `:root`, there is this:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-surface-strong: var(--surface-strong);
  --color-surface-elevated: var(--surface-elevated);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-soft: var(--primary-soft);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent-soft: var(--accent-soft);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --color-ring: var(--ring);
  --font-sans: var(--font-manrope);
  --font-mono: var(--font-jetbrains-mono);
}
```

**This is the magic.** Any `--color-*` name you put inside `@theme` automatically becomes a Tailwind utility. So `--color-surface` turns into:

- `bg-surface`
- `text-surface`
- `border-surface`
- `ring-surface`
- `from-surface`, `to-surface` for gradients
- `fill-surface`, `stroke-surface` for SVG

### 3c. Token reference table

Here are the tokens this project exposes. Use these instead of hardcoded hex colors.

| Token (CSS var)            | Tailwind classes                                                  | What it is                           |
| -------------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| `--color-background`       | `bg-background`, `text-background`                                | Main page background                 |
| `--color-foreground`       | `text-foreground`, `bg-foreground`                                | Main text color                      |
| `--color-surface`          | `bg-surface`, `border-surface`                                    | Card and panel surface               |
| `--color-surface-strong`   | `bg-surface-strong`                                               | Hover / slightly darker surface      |
| `--color-surface-elevated` | `bg-surface-elevated`                                             | Popovers, elevated cards             |
| `--color-border`           | `border-border`                                                   | Default border                       |
| `--color-border-strong`    | `border-border-strong`                                            | Emphasized border                    |
| `--color-muted`            | `bg-muted`                                                        | Subtle backgrounds                   |
| `--color-muted-foreground` | `text-muted-foreground`                                           | Secondary text                       |
| `--color-primary`          | `bg-primary`, `text-primary`                                      | Brand green                          |
| `--color-primary-foreground` | `text-primary-foreground`                                       | Text on primary background           |
| `--color-primary-soft`     | `bg-primary-soft`                                                 | Tinted primary background            |
| `--color-accent`           | `bg-accent`, `text-accent`                                        | Purple accent                        |
| `--color-accent-soft`      | `bg-accent-soft`                                                  | Tinted accent background             |
| `--color-success`          | `bg-success`, `text-success`                                      | Positive amounts, gains              |
| `--color-warning`          | `bg-warning`, `text-warning`                                      | Caution states                       |
| `--color-danger`           | `bg-danger`, `text-danger`                                        | Expenses, errors                     |
| `--color-ring`             | `ring-ring`, `focus-visible:ring-ring`                            | Focus ring color                     |
| `--shadow-sm`              | `shadow-[var(--shadow-sm)]`                                       | Small shadow                         |
| `--shadow-md`              | `shadow-[var(--shadow-md)]`                                       | Medium shadow                        |
| `--shadow-lg`              | `shadow-lg`, `shadow-[var(--shadow-lg)]`                          | Large shadow                         |
| `--shadow-glow`            | `shadow-[var(--shadow-glow)]`                                     | Primary-tinted glow                  |

> **Read this carefully:** `bg-surface` is not built into Tailwind. It does not exist in the default Tailwind palette. It comes from the `--color-surface` variable defined in `app/globals.css`. If you delete that variable, `bg-surface` stops working. The color tokens and the Tailwind classes are the same thing, viewed from two sides.

---

## 4. Dark Mode

Dark mode is handled entirely through CSS variables and a `data-theme` attribute on the `<html>` element. The React side is in `components/theme-provider.tsx`.

Look at the effect inside `ThemeProvider`:

```tsx
const root = document.documentElement;
const mql = window.matchMedia("(prefers-color-scheme: dark)");
const apply = () => {
  const effective: "light" | "dark" =
    theme === "system" ? (mql.matches ? "dark" : "light") : theme;
  root.setAttribute("data-theme", effective);
  root.classList.toggle("dark", effective === "dark");
  setResolved(effective);
};
```

That sets `data-theme="dark"` on `<html>` when dark mode is active. Then in `globals.css` there is a second `:root` block scoped to that attribute:

```css
:root[data-theme="dark"] {
  --background: oklch(14% 0.02 175);
  --foreground: oklch(96% 0.012 165);
  --surface: oklch(19% 0.025 175);
  /* ... and so on ... */
}
```

**What this means for you:** every token has two values — one in light, one in dark. When the attribute flips, every `bg-surface`, `text-foreground`, `border-border` instantly resolves to the new color. You do not write `dark:bg-zinc-900` anywhere in components. The variable does it for you.

So the rule is simple: **if you use theme tokens, dark mode just works.** If you hardcode `bg-[#ffffff]`, dark mode breaks.

Toggling is done with the `useTheme()` hook:

```tsx
import { useTheme } from "@/components/theme-provider";

const { toggle, resolvedTheme } = useTheme();
```

There is also a `prefers-color-scheme: dark` media query block in `globals.css` so users get dark mode automatically on first visit if their OS is set that way.

---

## 5. Anatomy of a Styled Component

Let us walk through `components/ui/card.tsx`. The default card variant uses this string:

```tsx
"glass rounded-2xl"
```

And the header row uses this:

```tsx
<div className="flex items-start justify-between gap-4 mb-5">
```

Let us dissect every class.

| Class              | What it does                                                      |
| ------------------ | ----------------------------------------------------------------- |
| `glass`            | Custom utility from `globals.css` — blurred translucent background |
| `rounded-2xl`      | `border-radius: 1rem`                                             |
| `flex`             | `display: flex`                                                   |
| `items-start`      | `align-items: flex-start`                                         |
| `justify-between`  | `justify-content: space-between`                                  |
| `gap-4`            | `gap: 1rem` between flex children                                 |
| `mb-5`             | `margin-bottom: 1.25rem`                                          |

And inside the card body the icon uses:

```tsx
"flex items-center justify-center w-11 h-11 rounded-xl shrink-0 bg-primary-soft text-primary"
```

| Class              | Meaning                                             |
| ------------------ | --------------------------------------------------- |
| `flex`             | Flexbox container                                   |
| `items-center`     | Vertically center children                          |
| `justify-center`   | Horizontally center children                        |
| `w-11 h-11`        | Width and height of `2.75rem` (44px)                |
| `rounded-xl`       | `border-radius: 0.75rem`                            |
| `shrink-0`         | `flex-shrink: 0` — never get squeezed by siblings   |
| `bg-primary-soft`  | Background from the `--color-primary-soft` token    |
| `text-primary`     | Text color from the `--color-primary` token         |

### The common utility categories

- **Layout.** `flex`, `grid`, `block`, `inline-block`, `hidden`. Picks `display`.
- **Flex / grid helpers.** `items-*` (align), `justify-*` (justify), `gap-*`, `flex-col`, `flex-row`.
- **Sizing.** `w-full`, `h-10`, `min-h-screen`, `max-w-md`. Widths and heights.
- **Spacing.** `p-4` (padding on all sides), `px-4 py-2` (x/y), `m-2` (margin), `gap-3` (grid/flex gap), `space-y-4` (space between children).
- **Colors.** `bg-surface`, `text-foreground`, `border-border`. All go through tokens.
- **Borders.** `border`, `border-2`, `rounded-xl`, `rounded-full`.
- **Typography.** `text-sm`, `font-semibold`, `tabular-nums`, `tracking-wider`, `uppercase`.
- **Effects.** `shadow-lg`, `transition`, `hover:bg-surface-strong`.

You will see every one of these in `components/ui/stat-tile.tsx`. Study that file — it is a dense but honest example of how a polished component is built.

---

## 6. Responsive Design

Tailwind is **mobile-first**. A class with no prefix applies at every screen size. Adding a prefix like `md:` makes it only apply above a breakpoint.

| Prefix | Minimum width |
| ------ | ------------- |
| (none) | 0px           |
| `sm:`  | 640px         |
| `md:`  | 768px         |
| `lg:`  | 1024px        |
| `xl:`  | 1280px        |
| `2xl:` | 1536px        |

Real example from `app/(app)/dashboard/page.tsx`:

```tsx
<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
```

Read it left to right:

- `grid` — make this a CSS grid (1 column by default).
- `gap-5` — 1.25rem gap between cells.
- `md:grid-cols-2` — at 768px and up, use 2 columns.
- `lg:grid-cols-4` — at 1024px and up, use 4 columns.

On a phone you get one column stacked. On a tablet you get two. On a laptop you get four. No media queries written by hand.

**Rule:** write your mobile styles first, then add `md:` or `lg:` overrides for larger screens. Doing it the other way around leads to pain.

---

## 7. State Variants

Tailwind lets you prefix a class with a state to make it only apply in that state.

Common ones you will use:

- `hover:bg-surface-strong` — on mouse hover
- `focus:border-primary` — on focus
- `focus-visible:ring-2 focus-visible:ring-ring` — keyboard focus ring
- `disabled:opacity-60 disabled:cursor-not-allowed` — when the element is disabled
- `active:scale-[0.97]` — while being clicked

Real example from `components/ui/button.tsx`:

```tsx
"inline-flex items-center justify-center gap-2 rounded-xl",
"transition-all duration-200 outline-none",
"focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
"active:scale-[0.97] select-none whitespace-nowrap",
"disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100",
```

There is also `group-hover:`, used when a parent has the `group` class and you want a child to react to the parent being hovered. The transactions row in the dashboard uses this pattern so the whole row lights up on hover while an internal icon recolors at the same time.

---

## 8. Arbitrary Values with Square Brackets

Sometimes you need a value Tailwind does not have in its scale. Use square brackets:

```tsx
<div className="h-[42px]" />
<div className="shadow-[var(--shadow-glow)]" />
<div className="bg-[#ff0000]" />
<div className="active:scale-[0.97]" />
```

**When to use arbitrary values:**

- A one-off pixel value that is not on the spacing scale (`w-[237px]`).
- Pulling from a CSS variable (`shadow-[var(--shadow-glow)]`) — this is common in this project, see the primary button.
- A very specific transform or filter.

**When NOT to use them:**

- Anything that repeats in more than one place. If you use the same hex color twice, add it to `globals.css` as a token instead.
- Colors that need to respond to dark mode. Arbitrary hex values do not change with the theme.

The primary button in `components/ui/button.tsx` is a great example of a legitimate arbitrary value:

```tsx
"gradient-primary text-white font-semibold shadow-[var(--shadow-glow)] hover:brightness-110"
```

That `shadow-[var(--shadow-glow)]` reads the token directly. The glow still adapts to dark mode because `--shadow-glow` is redefined in `:root[data-theme="dark"]`.

---

## 9. Custom Animations

This project has a small library of custom animations in `globals.css`. They are defined as `@keyframes` and then attached to `.anim-*` utility classes.

The keyframes:

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

The class that uses them:

```css
.anim-fade-up {
  animation: fade-in-up 520ms var(--ease-spring) both;
}
```

And there are five stagger-delay helpers:

```css
.anim-delay-1 { animation-delay: 60ms; }
.anim-delay-2 { animation-delay: 120ms; }
.anim-delay-3 { animation-delay: 180ms; }
.anim-delay-4 { animation-delay: 240ms; }
.anim-delay-5 { animation-delay: 300ms; }
```

### Using them

Apply `anim-fade-up` to any element and it will fade up on mount. To stagger a list, combine it with an inline `animationDelay`:

```tsx
{items.map((item, i) => (
  <div
    key={item.id}
    className="anim-fade-up"
    style={{ animationDelay: `${i * 60}ms` }}
  >
    {item.label}
  </div>
))}
```

A real occurrence from `app/(app)/dashboard/page.tsx`:

```tsx
<div className="anim-fade-up group relative rounded-2xl border border-border bg-surface/80 p-4 transition hover:border-border-strong hover:bg-surface">
```

The full list of animation utilities in `globals.css`:

| Class                 | Effect                                |
| --------------------- | ------------------------------------- |
| `anim-fade-in`        | Opacity 0 -> 1                        |
| `anim-fade-up`        | Fade in while sliding up 12px         |
| `anim-scale-in`       | Pop in from 94% scale                 |
| `anim-slide-in-right` | Slide in from the right               |
| `anim-slide-in-left`  | Slide in from the left                |
| `anim-pulse-ring`     | Pulsing glow ring (for CTAs)          |
| `anim-shimmer`        | Skeleton loading shimmer              |

There is also a `@media (prefers-reduced-motion: reduce)` block that disables everything for users who have that OS setting turned on. You do not have to think about it — it is handled globally.

---

## 10. Gradients and Glass

Tailwind's built-in gradient utilities are verbose (`bg-gradient-to-r from-... via-... to-...`). This project provides a few named utility classes in `globals.css` instead.

From `globals.css`:

```css
.gradient-text {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.gradient-primary {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: var(--primary-foreground);
}

.gradient-border {
  /* creates a 1px animated gradient border around any element */
}
```

### How they are used

The big Finnova wordmark uses `gradient-text`:

```tsx
<div className="text-lg font-extrabold gradient-text leading-none">Finnova</div>
```

The savings rate on the dashboard uses it too:

```tsx
<div className="text-5xl font-black gradient-text tabular-nums">{rate}%</div>
```

The primary button uses `gradient-primary`:

```tsx
"gradient-primary text-white font-semibold shadow-[var(--shadow-glow)] hover:brightness-110"
```

### Glass

There are two glass utilities used heavily on cards:

```css
.glass {
  background: color-mix(in oklab, var(--surface) 82%, transparent);
  backdrop-filter: blur(18px) saturate(1.15);
  border: 1px solid color-mix(in oklab, var(--border) 90%, transparent);
  box-shadow: var(--shadow-md);
}
.glass-strong { /* similar, heavier */ }
```

That is how `Card` with `variant="default"` gets its frosted look — its class string is literally `"glass rounded-2xl"`. And `hover-lift` is a companion class that makes a card rise and glow on hover. Look inside `StatTile`:

```tsx
"glass anim-fade-up hover-lift relative overflow-hidden rounded-2xl p-5"
```

That one line gets you a frosted card that fades in on mount and lifts on hover.

---

## 11. When to Extract a Component

If you find yourself copying the same long class string twice, stop and make a component.

The classic example is the Button. Without extraction, every button in the app would look like:

```tsx
<button className="inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97] select-none whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed gradient-primary text-white font-semibold shadow-[var(--shadow-glow)] hover:brightness-110 h-11 px-5 text-sm">
  Save
</button>
```

With extraction (`components/ui/button.tsx`), you just write:

```tsx
<Button variant="primary" size="md">Save</Button>
```

The Button component internally has a `variantClasses` and `sizeClasses` lookup that picks the right class string for you. Study how it uses `Record<ButtonVariant, string>` — that is the standard pattern for variant-based components in this project.

Rule of thumb: **copy once, extract on the second use.**

---

## 12. Common Beginner Mistakes

- **Using `class=` instead of `className=`.** In JSX you always write `className`. `class` is silently ignored.
- **Forgetting responsive prefixes.** Mobile looks fine, desktop is broken — or vice versa. Add `md:` and `lg:` overrides.
- **Hardcoding hex colors.** `bg-[#ff0000]` does not change in dark mode. Use `bg-danger` instead.
- **Reaching for `!important`.** Tailwind has a prefix for that (`!bg-red-500`) but you almost never need it. If you think you need it, your component structure is probably fighting itself.
- **Mixing inline `style={{...}}` with Tailwind.** Use inline styles only for dynamic values (like `animationDelay` computed from an index). For everything static, use a Tailwind class or arbitrary value.
- **Writing your own CSS file for a component.** Do not. Either use utilities or add a utility class to `globals.css` if it will be reused.
- **Putting colors in places that are not theme-aware.** Always ask: does this need to work in dark mode? If yes, use a token.

---

## 13. Quick Reference — The 30 Classes You Will Use Most

**Layout**

| Class            | Meaning                          |
| ---------------- | -------------------------------- |
| `flex`           | `display: flex`                  |
| `grid`           | `display: grid`                  |
| `hidden`         | `display: none`                  |
| `items-center`   | Vertical center in flex          |
| `justify-between`| Space-between in flex            |
| `gap-4`          | Gap between children             |
| `grid-cols-2`    | Grid with 2 columns              |

**Sizing**

| Class        | Meaning                 |
| ------------ | ----------------------- |
| `w-full`     | `width: 100%`           |
| `h-10`       | `height: 2.5rem`        |
| `max-w-md`   | Max width 28rem         |
| `min-h-screen`| Min height 100vh       |

**Spacing**

| Class        | Meaning                      |
| ------------ | ---------------------------- |
| `p-4`        | `padding: 1rem`              |
| `px-4 py-2`  | Horizontal + vertical padding|
| `m-2`        | Margin on all sides          |
| `mt-6`       | Margin top                   |
| `space-y-4`  | Vertical space between children |

**Colors**

| Class               | Meaning                          |
| ------------------- | -------------------------------- |
| `bg-surface`        | Card background token            |
| `text-foreground`   | Main text token                  |
| `text-muted-foreground` | Secondary text               |
| `border-border`     | Default border token             |
| `text-primary`      | Brand green text                 |

**Typography**

| Class           | Meaning                    |
| --------------- | -------------------------- |
| `text-sm`       | Small font size            |
| `text-3xl`      | Big display size           |
| `font-semibold` | Semibold weight            |
| `tabular-nums`  | Equal-width numbers (key for money!) |
| `truncate`      | Clip with ellipsis         |

**Effects**

| Class                  | Meaning                        |
| ---------------------- | ------------------------------ |
| `rounded-xl`           | Large border radius            |
| `shadow-lg`            | Large shadow                   |
| `transition`           | Animate property changes       |
| `hover:bg-surface-strong` | Hover background            |

Keep this table open while you build your first few components. You will memorize it faster than you expect.

---

## 14. Where to Look Things Up

- **Official v4 docs:** https://tailwindcss.com/docs — the reference for every utility. Make sure it is v4 docs, not v3.
- **This project's tokens:** `app/globals.css`. If a `bg-*` or `text-*` class looks unfamiliar, search that file for the matching `--color-*` variable.
- **Real component examples:** any file in `components/ui/*`. Card, Button, and StatTile cover 90% of the patterns.
- **Dashboard layout patterns:** `app/(app)/dashboard/page.tsx` is the densest, most up-to-date example of grids, animations, and stagger timing.

---

## 15. Related Docs

- [CODEBASE_EXPLAINED.md](./CODEBASE_EXPLAINED.md) — how the whole repo is laid out
- [REACT_BASICS_FOR_THIS_PROJECT.md](./REACT_BASICS_FOR_THIS_PROJECT.md) — JSX, state, and effects the way this project uses them

Once you have these two and this Tailwind guide under your belt, you can open any component in the repo and know what every line is doing.
