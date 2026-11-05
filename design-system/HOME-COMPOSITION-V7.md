# Cevris Plot 0.7 — curated home and figure composition

The owner's later request supersedes the v6 library-first rule: default to a curated homepage. Keep the complete library a single navigation action away. Never silently choose recommendations for the owner.

## Visual direction

Preserve the established mist-blue surfaces, ink-blue text, restrained borders and open chart space. Numbers distinguish actual templates, not broad categories. Real R thumbnails are the primary selection surface. Gallery controls remain secondary, without hero graphics, decorative statistics or product claims.

## Interaction

- Separate image enlargement from selecting a recommendation. Visible focus, labelled buttons, selection state and explicit save/cancel.
- A short ordered selection strip supports keyboard-accessible reordering and removal. Search accepts stable identifiers and template names.
- Composition uses a grouped left inspector and a spacious canvas. Keep panel selection, parameter matching, layout and export in separate sections.
- Keep scientific parameter sync explicit. Appearance sync preserves measurements, labels and mappings.
- Maintain the last image while R updates, discard stale responses, and expose render errors. Export always uses current validated settings.
- Respect the existing reduced-motion rules; transitions carry feedback rather than delay it.
- On narrow screens the preview precedes controls; the navigation must remain reachable without body overflow.

## Review criteria

Verify selection order survives reload, preview dialogue closes by keyboard, editing a panel updates only its snapshot, same-type sync preserves data, moving panels changes labels, and exported files reproduce the layout. Check Chinese and English at desktop and narrow widths. Screenshots and test artifacts belong in excluded verification directories, not the distribution.

## Design critique

The gallery supports choosing by actual appearance and the composer keeps technical detail behind four readable sections. The 12-panel fixed grid intentionally bounds this first implementation. Shared legends, arbitrary spans and free placement require further layout work. Long labels and mixed aspect ratios still need visual review; automatic width alignment cannot guarantee every scientific layout.
