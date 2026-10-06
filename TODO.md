# Gottado TODO

## Onboarding

- [ ] Add a short, skippable tour for first-time visitors, with “Take a tour” available in Find notes and actions so it can be replayed. Cover adding the first note, nesting and opening sublists, completion and undo, search and shortcuts, view-only mode, sharing, and feedback. Support keyboard and touch navigation, respect reduced motion, remember dismissal locally, and avoid changing the user's notes.

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
- [ ] Test cross-browser clipboard, wrapping, reduced motion, mobile layout, and assistive-technology behavior more broadly.

## Implemented

- [x] Header Experimental dropdown lists feature names with toggles. Every experiment defaults off; explicit choices are remembered locally. Dragging notes is the first experiment, with handles hidden and pointer reordering disabled until enabled. View-only still prevents dragging.
- [x] With experimental dragging enabled, use dedicated handles to reorder, nest under another note, or move into a breadcrumb list. Descendants stay attached, self/descendant drops are blocked, edge scrolling is supported, and Escape cancels before any change.
- [x] Between-note plus opens New note and Child note choices, replacing the trailing child-add icon. Only the plus is clickable; touch devices always show it.
- [x] Two separate Backspace presses within 800 ms delete an empty note without confirmation. Children are preserved, held keys cannot trigger deletion, and undo remains available.
- [x] Copied Markdown uses plain nested bullets without completion brackets.

- [x] Alt+Up/Down moves branches freely into and out of sublists, keeping descendants attached and following focus across scoped views.
- [x] View-only mode prevents text editing, completion, deletion, insertion, indentation, and reorder; permits folding, navigation, copy, and sharing. Checkboxes are hidden.
- [x] View-only uses fixed reading width; theme, font, and size remain available. Mode toggle is an icon button.
- [x] The header stays sticky without scroll-driven sizing or animations.
- [x] Wrapping new-note textarea; Up/Down navigate its visual lines and move to the last/first visible note at the edges. Notes navigate back to the draft at list boundaries.
- [x] Notes added or pasted through “What needs doing?” appear at the top of the current list or sublist, preserving pasted note order.
- [x] Navigating or tabbing to a note places the caret at the end of its text, including search results and sublist navigation.
- [x] Theme-colored editing outline and short note-copy outline flash; copying changes only the outline.
- [x] Minimal plus controls between visible notes, revealed on hover or focus. The new-note input handles insertion before the first note.
- [x] Ctrl/⌘+C copies the whole focused note when no text is selected; selected text retains ordinary clipboard behavior.
- [x] Per-note trash icons, Delete, and the action palette open deletion confirmation; Enter confirms immediately. Deletion undo remains available after its toast disappears while it is within the last five app actions.
- [x] Unified undo tracks the last five reversible app actions across insertion/paste, completion, moving/nesting, individual and bulk deletion, folding, navigation, settings, and experimental toggles. Ctrl/⌘+Z inside textboxes always remains native text undo; outside it reverses app actions newest first. Action search offers explicit app undo. Empty history explains the five-action limit, and undo preserves later text edits to surviving notes. History is kept only for the current session.
- [x] Parent deletion preserves children by default; checking “Delete all children too” deletes the whole branch. Undo restores the deleted branch with its nesting and completion state.
- [x] Parent completion follows all descendants. Checking or unchecking a parent applies to its branch; child changes, insertions, moves, deletion, undo, and imports keep ancestor completion consistent. Ctrl/⌘+Space toggles completion and is documented in the guide and action search.
- [x] Combined action/note search, visible search icon/button, and delayed tooltips. Exact note matches rank above loosely matching actions; selecting a result navigates to its parent list.
- [x] All modals close on outside clicks and restore the last focused note at its text end, or a neighboring note if it was deleted.
- [x] Theme options preview immediately while navigating either picker; closing without selection restores the saved theme.
- [x] Unlimited logical nesting, sublist hash routes, browser history, Home breadcrumbs, and Back navigation. Physical indentation is capped to keep deeply nested notes readable.
- [x] Only notes with children expose sublist navigation; leaf routes redirect to their containing list. Alt+Enter enters and Alt+Backspace returns with focus restored, including in view-only mode.
- [x] Shareable whole-list and sublist snapshot links; recipients open a separate snapshot without overwriting local notes. Share icon sits beside the title.
- [x] Brief bottom-right feedback with feature hints and a consistent springy entrance and short downward-slide dismissal; deletion feedback lasts 2.2 seconds and other feedback 1.8 seconds.
- [x] Remove inline clear-completed, remove-all, collapse-all, and expand-all buttons; retain their palette actions and documented shortcuts. Bulk deletion shortcuts open confirmation with focus on the confirm button.
- [x] Remove the hierarchy option; nesting is always available.
- [x] Feedback header icon and action-search entry open Quackback in a new tab. Local API management helper reads ignored credentials without exposing them to the browser.
- [x] Use “Fight procrastination by listing your troubles away” once on the empty main page, in share metadata, and in project documentation. The browser tab reads “Gottado: Fight Procrastination.” Remove research claims and em dashes from descriptions.

## Current behavior and constraints

Routes use `#/list/<note-id>` and `#/shared/list/<note-id>`. They stay within the SPA, work without server rewrite configuration, and do not fetch data. Local list routes depend on that browser having the corresponding note; share links carry their own snapshot. Scope navigation slices the in-memory outline to a branch.

Backend work is deferred. Ordinary notes save immediately to localStorage; there is no server “Saved!” countdown yet. Shared snapshots stay separate in sessionStorage.

Social previews read the static page metadata, so whole-list and sublist links share the app description. Messaging services can cache older previews after deployment.
