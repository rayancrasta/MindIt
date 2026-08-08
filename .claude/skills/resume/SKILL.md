---
name: resume
description: use when the user wants a recap of where they left off, what's pending, or the status of the work-tracker board
---

Call the `get_resume` MCP tool. Pass `project` if the user named one or it's obvious from the current directory; omit it for a cross-project recap.

Narrate the JSON result in this fixed order, short and plain:

1. Pending features (if any)
2. Pending stories (if any)
3. Pending tasks (if any)
4. Pending bugs (if any)
5. The last session note (`lastSession.done`, plus `blockers`/`next` if present)
6. Exactly one suggested next step, based on `lastSession.next` if it exists, otherwise your best read of what's most pending

If the user asked specifically for counts/metrics rather than a recap ("what's the status", "how many open X"), call `get_status` instead and just report the numbers.

Keep it short — this is a recap, not a report. Skip empty sections rather than saying "no pending X." If nothing is pending anywhere, say so in one line.
