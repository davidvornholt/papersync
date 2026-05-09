# PaperSync Design

PaperSync exists at the seam between paper and a second brain. The interface
should feel like *the kind of magazine you keep on the shelf* — paper-first,
editorially ruthless, generous with air, calm in colour, and confident enough
to do less. The product is a quiet bridge between hand and machine. The design
should disappear into that bridge.

This document is the spirit of the system. The vocabulary that implements it
lives in [`packages/ui/src/theme.css`](./packages/ui/src/theme.css).

## North star

> **Editorial atelier, not dashboard.**
> Every screen should feel composed for ink, not assembled for clicks.

If a decision moves the work toward looking like a SaaS app — denser
chrome, more chips, more buttons-per-square-inch, more rounded surfaces — it
moves away from PaperSync. If a decision moves the work toward looking like a
well-set page in a thoughtful periodical — fewer marks, better typography,
more white — it moves toward PaperSync.

## Voice

PaperSync speaks in three typographic voices.

- **Display, in serif.** Fraunces in its softer, slightly wonky cut sets the
  page. It is used for headlines and for the rare sentence that needs to feel
  *spoken*. When the design wants emphasis, the answer is almost always the
  italic of the same family, not a different colour or weight.
- **Body, in sans.** DM Sans handles paragraphs, controls, and labels. It is
  warm, easy to read at long lengths, and recedes politely behind the serif.
- **Marginalia, in mono.** JetBrains Mono in widely tracked uppercase
  carries section numbers, eyebrows, field labels, and small editorial
  asides. Mono should always feel like a margin note, never like console
  output.

The interface uses **sentence case**. It rarely shouts. When it does shout,
it whispers — a single italic phrase set in oxblood inside a long serif
sentence does more than ten bold buttons.

## Colour

The palette is a small set of paper and ink with one accent.

- **Paper.** A warm cream, never bright white, never cold grey. The whole
  surface should feel like stock you would happily print on.
- **Ink.** A deep neutral, never pure black. It carries headlines, body text,
  primary buttons, and the rare confident underline.
- **Hairlines.** A muted line colour used for borders, dividers, and the
  small ruled marks that separate sections. Hairlines should always feel
  printed, never extruded.
- **Oxblood accent.** A single warm red is the only colour the system uses
  for emphasis. It appears in the italic word that earns it, in the
  underline that draws on hover, in the active state of a control. If a
  screen has more than two oxblood touches in view at once, it is doing too
  much.

There are no decorative gradients, no glows, no neons, no soft blues, no
"primary brand" splashes. Backgrounds are paper. Foregrounds are ink. One
small flame of oxblood is enough.

## Surfaces

Surfaces are framed by hairlines, not by shadow or radius.

- **Corners are 0px.** Every named radius in the theme is zero. Cards,
  modals, image previews, code blocks, schedule cells, inputs, and buttons
  are all sharp rectangles. The only exception is `rounded-full`, reserved
  for genuine circles such as status dots, avatars, and spinners.
- **Borders are 1px hairlines.** A surface is "lifted" by being framed by a
  thin printed line, not by a drop shadow.
- **No glass, no frosted blur.** PaperSync is not stationery for an OS — it
  is stationery for a workflow.

## Buttons & affordance

Because corners are sharp, **the click affordance is carried by colour and
the inline arrow**, not by shape and not by motion. The button system is
intentionally small, the moves are precise, and one rule overrides all
others: **a button never moves and never changes size**. Width, height,
padding, border-width, and letter-spacing are constant across `:hover`,
`:active`, and `:focus`.

- **Primary** is solid ink on paper. On hover and on focus it washes to
  oxblood. On press it deepens to the darker oxblood. The label colour
  stays paper across every state — including over the oxblood background,
  which is the contrast the design depends on.
- **Secondary** is a transparent rectangle framed by a strong hairline.
  On hover and focus the border darkens to ink, the label shifts to
  oxblood, and the background washes to a deeper paper. On press the
  oxblood deepens.
- **Ghost** is type-only. On hover and focus an oxblood hairline draws
  beneath the label, left to right, over ~320ms. Nothing else moves.
- **Arrow.** Any button with a directional intent carries a small inline
  arrow that slides +5px to the right on parent hover and eases back on
  press. It should always read as forward momentum, never as decoration.

A user should never need to wonder if something is interactive. The
interaction itself should answer the question the moment they hover.

## Motion

Motion is restrained, paper-feeling, and almost always ≤ 800ms. The system
keeps three named curves and three named keyframes.

- **`paperRise`** — a 14px upward translate plus opacity, the default entry
  for content that should feel laid down. Used for hero blocks, eyebrows,
  and section headlines.
- **`inkDraw`** — an `scaleX` from 0 → 1 originating from the left edge.
  Used for underlines, section rules, and the ghost button hairline.
- **`softFade`** — opacity only. Used when the eye should not feel pulled.

Stagger is allowed but not piled on. Two or three delays in a sequence
(`.delay-100`, `.delay-200`, `.delay-300`) is plenty; eight is theatre.

The system honours `prefers-reduced-motion` globally — every animation and
transition collapses to ~0ms.

## Layout

Three shells carry the entire product.

- **`.shell`** is the standard 1160px maximum, with `clamp()` padding that
  breathes from 1.25rem on small screens to 3.5rem on large ones.
- **`.shell-narrow`** is the same shell at 820px maximum, used for long
  reading passages where measure matters more than width.
- **`.page-shell`** sits inside a shell on app screens (Scan, Planner,
  Settings) and provides a tight top padding so the user lands at their
  work. The hero/landing pages do not use it — they breathe intentionally.

A consistent grid (typically 12 columns on desktop) underlies most pages,
but the visible chrome should always be hairlines and white space, never
boxed cells.

## Density

PaperSync is calmly low-density. As a rule of thumb:

- **One headline per section.**
- **One primary action per screen.** A second action, when needed, is the
  quiet variant.
- **One eyebrow per heading.** The mono uppercase eyebrow sets context;
  more than one starts to feel like a navigation tree.
- **One oxblood touch per viewport.** The accent earns its weight by
  scarcity.
- **Hairlines do the work of a thousand boxes.** When in doubt, a single
  1px rule is almost always enough to separate two ideas.

If a screen feels busy, the answer is rarely a smaller font or a tighter
gap. The answer is removing something.

## What it is not

PaperSync explicitly refuses several common product looks.

- It is not a glassmorphism app. No frosted panels, no blurred backdrops.
- It is not a neon dashboard. No glowing primaries, no chip-soup of
  coloured tags.
- It is not a Notion clone. Hairlines, not "everything is a block".
- It is not a Material/iOS lookalike. Sharp rectangles, not soft pills.
- It is not "fun". The mood is calm, considered, slightly austere — the
  way a well-made book is calm. Delight comes from the typography and the
  micro-interactions, not from emoji or illustration.

## When in doubt

Ask: *would a thoughtful art director sign off on this page if it were
printed at A4 on warm cream stock?* If the answer is yes, ship it. If the
answer is "almost — but it's a bit busy / a bit loud / a bit shiny", trim
until the answer is yes.

## Where the rules live

- The narrative — this file — is the why.
- The vocabulary —
  [`packages/ui/src/theme.css`](./packages/ui/src/theme.css) — is the how.
- The two should always agree. A change in one without a corresponding
  change in the other is a bug in the system.
