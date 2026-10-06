# Gottado

Fight procrastination by listing your troubles away.

Originally exported from https://gottodo.zaidio.chatgpt.site/

Git commit: 37bfadce205bdc656518cb4ba76abeb716b8c8ca
Export date: 2026-10-02

## Run locally

Install Node.js compatible with Vite 8, then run:

```sh
npm ci
npm run dev
```

Production build: `npm run build`. Preview: `npm run preview`.

## Organizing notes

Experimental features are opt-in through the header dropdown and start switched off. Enable Dragging notes to show drag handles; your choice is remembered locally. Drag a note's handle above or below another note to reorder it, or onto its center to make it a child. Children move with their parent. Drop onto Home or a breadcrumb to move into that list; Escape cancels. Alt+Up/Down also moves notes between levels without enabling the experiment.

The plus between notes offers New note and Child note. Enter adds a sibling while editing; Ctrl/⌘+Enter adds a child. Press Backspace twice within 800 ms on an empty note to remove it without confirmation, preserving its children. Copy Markdown exports plain nested bullets without completion brackets.

Ctrl/⌘+Z inside a textbox always uses native text undo. Outside textboxes it reverses the last five app actions, newest first, including adding/pasting notes, completion, moving, nesting, deletion (including bulk deletion), folding, list navigation, and settings. Find notes and actions also offers Undo latest app action. Undo preserves later text edits to surviving notes. Older actions are discarded, empty history shows the limit, and app history resets when the page reloads.

## Included code

- src.jsx: main React application, editing, keyboard shortcuts, dialogs and settings.
- command-palette.jsx: searchable action palette.
- outline.js: hierarchy operations.
- paste.js: structured list paste parsing.
- markdown.js: Markdown export.
- undo.js: deletion undo state.
- action-history.js: five-action app undo and native text shortcut routing.
- themes.js and style.css: themes and presentation.
- public/fonts: bundled fonts.
- package.json and package-lock.json: dependency declarations and exact dependency resolution.
- .openai/hosting.json: Sites hosting configuration.

Tasks and preferences are saved in browser localStorage. User task data is not part of this source export. Installed dependencies and generated build output can be reproduced with the commands above. Dependency license metadata is available through the installed packages; the source package includes no hosting credentials or browser session files.

SHA256SUMS lists hashes of every included source file.
