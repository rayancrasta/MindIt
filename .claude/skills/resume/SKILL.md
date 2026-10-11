---
name: resume
description: use when the user wants a recap of where they left off, what's pending, or the status of the work-tracker board
---

Call the `get_resume` MCP tool. Pass `project` if the user named one or it's obvious from the current directory; omit it for a cross-project recap.

The result is short plain text: a `Pending` line with counts, open features and items in testing as id lists, one line per other pending item, then the last handover (`Summary`, `Blockers`, `Next`, `Touched`), the last deployment, and the assumptions to review. Narrate it in this fixed order, short and plain:

1. What's in progress, then what's queued (new); mention the testing and open-feature id lists in one line each
2. The last handover: its summary, plus blockers and next if present
3. If there's a `Touched:` line, one line naming exactly what was touched last session (e.g. "last touched: Story #15 'Add step-up modal' (in_progress), Task #23 'Write race condition test' (new)") — this is the precise handoff context, state it plainly rather than paraphrasing
4. If there are assumptions to review, one line per entry (lowest confidence first): title, confidence, and what to confirm if given — these are unreviewed guesses; offer to walk through them and mark each done with `review_assumption`
5. Exactly one suggested next step, based on the handover's `Next` if it exists, otherwise your best read of what's most pending

Need more on one item? Call `get_item` for its notes and comments rather than `get_resume` with `detail: true`, which returns everything and is large. For older handovers call `search_handoffs` (brief by default).

If the user asked specifically for counts/metrics rather than a recap ("what's the status", "how many open X"), call `get_status` instead and just report the numbers.

Keep it short — this is a recap, not a report. Skip empty sections rather than saying "no pending X." If nothing is pending anywhere, say so in one line.
