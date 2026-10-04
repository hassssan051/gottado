# Remaining work

## Backend phase

- [ ] Implement debounced autosave with a visible `1 → 2 → 3 → Saved!` status. Use a grey outlined countdown and green outlined success state. Reset the countdown when another edit arrives; show Saved only after the server acknowledges it. Include retry, offline, and error states.
- [ ] Define stable list and note identifiers, parent relationships, ordering, access control, and deletion/undo contracts.
- [ ] Load top-level notes first and fetch children on demand. Persist expanded note IDs separately from content, initially in localStorage, then optionally sync them per user.
- [ ] Restore an expanded path by fetching its ancestors and visible children in batches; support direct links to unloaded sublists without downloading every descendant.
- [ ] Define search across unloaded branches: server search should return matching notes and their ancestor paths.
- [ ] Replace snapshot sharing with short persistent links, permissions, revocation, and optional live updates. Current links contain a copy of the list's text and completion state; later edits do not update an already shared link.

## Scale and polish

- [ ] Benchmark large lists and very deep nesting. Replace repeated array scans with indexed parent/branch relationships, virtualize long visible lists, and debounce search if measurements justify it.
- [ ] Add compact or compressed sharing/export for large lists. Snapshot URLs grow with note content and can exceed the practical limits of messaging apps.
- [ ] Add a durable “Save shared snapshot to my list” action. Snapshots currently stay separate in sessionStorage and can be edited within that tab without replacing the saved local list.
- [ ] Add an accessible touch-first insertion affordance; current between-note insertion appears on hover or keyboard focus.
- [ ] Decide whether to offer an optional Alt+Up/Down behavior that crosses parents. The implemented default stops at sibling boundaries and keeps the branch's parent and depth.
- [ ] Test cross-browser clipboard, wrapping, reduced motion, mobile layout, and assistive-technology behavior more broadly. Current verification covers the local desktop browser and outline logic.

## Implemented in this update

- [x] Alt+Up/Down moves branches freely into and out of sublists, keeping descendants attached and following focus across scoped views.
- [x] View-only mode prevents text editing, completion, deletion, insertion, indentation, and reorder; permits folding, navigation, copy, and sharing.
- [x] View-only uses fixed reading width; theme, font, and size remain available. Mode toggle is an icon button.
- [x] Wrapping new-note textarea; Up/Down navigate its visual lines and move to the last/first visible note at the edges. Notes navigate back to the draft at list boundaries.
- [x] Theme-colored editing outline and short note-copy outline flash.
- [x] Minimal plus controls between visible notes, revealed on hover or focus. The new-note input handles insertion before the first note.
- [x] Ctrl/⌘+C copies the whole focused note when no text is selected; selected text retains ordinary clipboard behavior.
- [x] Delete and the action palette open note-deletion confirmation; Enter confirms immediately. Undo remains available for the session, even after its toast disappears.
- [x] Combined action/note search, visible search icon/button, and delayed, shorter tooltips. Exact note matches rank above loosely matching actions; selecting a result navigates to its parent list.
- [x] Unlimited logical nesting, sublist hash routes, back-to-parent button, browser history, and wrapping breadcrumbs. Physical indentation is capped to keep deeply nested notes readable.
- [x] Shareable whole-list and sublist snapshot links; recipients open a separate snapshot without overwriting local notes.
- [x] Brief bottom-right feedback with feature hints and a consistent springy entrance and a short springy downward-slide dismissal; deletion feedback lasts 2.2 seconds and other feedback 1.8 seconds.
- [x] Remove the hierarchy option; nesting is always available.

## Route and performance notes

Routes use `#/list/<note-id>` and `#/shared/list/<note-id>`. They stay within the SPA, work without server rewrite configuration, and do not fetch data. Local list routes depend on that browser having the corresponding note; share links carry their own snapshot. Scope navigation slices the in-memory outline to a branch; it does not introduce network usage. Very large lists still need indexing and rendering benchmarks before performance promises are made.

Backend work is deliberately deferred. The current app continues to save ordinary notes immediately to localStorage; it does not display a misleading server “Saved!” countdown.

- [x] Remove inline deletion, clear-completed, remove-all, collapse-all, and expand-all buttons; retain their palette actions and document shortcuts in both modals. Bulk deletion shortcuts open confirmation with focus on the confirm button.

- [x] Only notes with children expose sublist navigation; leaf routes redirect to their containing list. A doorway-arrow icon opens sublists, Alt+Enter enters them, and Alt+Backspace returns with focus restored. Both shortcuts are documented in the action palette and guide.

- [x] Notes added or pasted through “What needs doing?” appear at the top of the current list or sublist, preserving pasted note order.
