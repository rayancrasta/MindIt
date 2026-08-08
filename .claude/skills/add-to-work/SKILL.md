---
name: add-to-work
description: use when the user wants to log a new feature, user story, task, or bug against the work-tracker board
---

Use the `work-tracker` MCP tools (`add_feature`, `add_story`, `add_task`, `add_bug`) to record what the user describes. Do not ask the user to categorize things in ADO jargon — infer it from how they're talking and confirm briefly if genuinely unclear.

## Project

Infer `project` from the current working directory's repo/folder name. If it's ambiguous (e.g. a generic directory name, or the user is clearly talking about a different project than the one they're in), ask which project.

## Which item type

- **Bug**: the user is describing something broken, a defect, a regression — call `add_bug`. A bug does not need a parent story; only attach `story` if the user names one or it's obvious from recent context (e.g. they just added a story and this bug clearly belongs to it).
- **Task**: the user is describing a concrete unit of work ("add a task to...", "I need to...", "todo:") — call `add_task`. A task always needs a parent `story`. If the user doesn't name one:
  - If there's exactly one open story in this project, or the conversation context makes the parent story obvious, use that.
  - Otherwise, call `list_stories` for the project and ask the user which story it belongs to (or offer to create a new story first).
- **Story**: the user is describing a larger unit of user-facing work ("we need to build...", "new story for...") — call `add_story`. A story always needs a parent `feature`, resolved the same way as a task's story (infer if obvious, otherwise `list_features` and ask, or offer to create one).
- **Feature**: the user is describing a broad initiative or epic-level thing ("new feature:", "kick off...") — call `add_feature`. No parent needed.

Extract a short `title` (a few words, not a full sentence) and put any additional detail in `notes`.

## After adding

Reply with a one-line confirmation naming what was created and its parent chain if relevant (e.g. "Added task 'Write race condition test' under story 'Add step-up modal'"). Don't over-explain.
