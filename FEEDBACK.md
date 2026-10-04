# Feedback and roadmap management

Public portal: https://gottodo.quackback.io/

The header feedback icon and Send feedback action open the portal in a separate tab. No widget, identity integration, or feedback API key is shipped to the browser.

## Local API access

Store `QUACKBACK_API_KEY` in `.env.local` (ignored by Git). The existing `QUACK_BACK_API_KEY` spelling is also supported. Never prefix this credential with `VITE_`.

Run from the project root:

```powershell
node scripts/quackback.mjs /boards
node scripts/quackback.mjs /posts
node scripts/quackback.mjs /statuses
node scripts/quackback.mjs /roadmaps
```

The CLI defaults to GET and uses the Gottado workspace only. For an authorized update, pass its method and a JSON body file, for example `node scripts/quackback.mjs /posts/<post-id> PATCH body.json`. Keep authentication out of body files. Replies/comments require the user's explicit instruction.

API reference: https://quackback.io/docs/api/introduction

Anonymous access is configured in Quackback, independently of Gottado. Enable anonymous interaction and allow it on the relevant boards. Test submission in a signed-out browser before launch.
