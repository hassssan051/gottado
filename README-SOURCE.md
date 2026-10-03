# gottodo source export

Complete application source snapshot for https://gottodo.zaidio.chatgpt.site/

Git commit: 37bfadce205bdc656518cb4ba76abeb716b8c8ca
Export date: 2026-10-02

## Run locally

Install Node.js compatible with Vite 8, then run:

```sh
npm ci
npm run dev
```

Production build: `npm run build`. Preview: `npm run preview`.

## Included code

- src.jsx: main React application, editing, keyboard shortcuts, dialogs and settings.
- command-palette.jsx: searchable action palette.
- outline.js: hierarchy operations.
- paste.js: structured list paste parsing.
- markdown.js: Markdown export.
- undo.js: deletion undo state.
- themes.js and style.css: themes and presentation.
- public/fonts: bundled fonts.
- package.json and package-lock.json: dependency declarations and exact dependency resolution.
- .openai/hosting.json: Sites hosting configuration.

Tasks and preferences are saved in browser localStorage. User task data is not part of this source export. Installed dependencies and generated build output can be reproduced with the commands above. Dependency license metadata is available through the installed packages; the source package includes no hosting credentials or browser session files.

SHA256SUMS lists hashes of every included source file.
