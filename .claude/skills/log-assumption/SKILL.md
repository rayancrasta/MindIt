---
name: log-assumption
description: use whenever you proceed under ambiguity — a requirement was unclear, several options looked plausible, or you filled a gap instead of asking — so the guess is recorded for human review via the work-tracker
---

Call the `add_assumption` MCP tool **at the moment you make the call**, not at the end of the session. Don't ask permission first; one short line afterwards is enough.

Log it when you:
- guessed what a vague requirement meant
- picked between plausible designs/libraries/behaviours without confirmation
- filled in a missing detail (default value, naming, edge-case handling) that the user didn't specify
- worked around something you couldn't verify

Fill in:
- `project` — the work-tracker project for the current directory
- `title` — the assumption in one line ("Treated deleted users as soft-deleted")
- `confidence` — `low` if you'd be surprised to be right, `medium` if unsure, `high` if you're fairly sure but it's still unconfirmed
- `body` — what was ambiguous and what you decided
- `alternatives`, `impact` (what breaks if wrong), `question` (what a human should confirm) — whenever you can say something useful
- links: `items` (the feature/story/task/bug you're working on), `wiki` (wiki paths), `refs` (`spec:web:<path>`, `diagram:<kind>:<path>`, `schema:<path>`), `code` (`file.ts:42`)

Don't log trivia or choices fully dictated by the codebase. Do log anything a reviewer would want to double-check.

To review: call `list_unreviewed_assumptions` (optionally filtered by `item` or `wiki`) — lowest confidence first. For each one you check, confirm or fix the underlying work, then call `review_assumption` with a short `note` on the outcome ("Confirmed: soft delete is fine" / "Changed to hard delete in #31"). Only mark it reviewed once it is actually addressed; use `reopen: true` to undo. `list_assumptions` also takes a `status` filter (`open`/`reviewed`).
