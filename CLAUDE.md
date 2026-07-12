# CLAUDE.md

## Code changes require a Backlog task

Every code change, however small, must be tied to a Backlog task — if none exists, create one before touching code. This overrides the Backlog overview's "skip task creation for obvious mechanical edits" guidance for code; docs-only edits are exempt.

## Branching

Implement each Backlog task on its own branch named after the task id (e.g. `gmc-999`), branched from `main`. When the task is done, merge with `git merge --no-ff` into `main`.

Mark the task Done only after the merge: code commits and in-progress task updates go on the branch, then merge into `main`, then set the task to Done (plus finalization notes) and commit that on `main`. Done means the work is reachable from `main`.

The `backlog` CLI auto-commits its task-file changes to the current branch (`autoCommit: true` in the backlog config) — never stage `backlog/` files manually, and be on the right branch when editing a task, since the commit lands immediately.

## Commits

Use conventional commits: `type: description` (e.g. `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).

In the commit body, add bullet points enumerating the most relevant changes, each with a brief rationale:

```
feat: add transcript flush on session end

- Flush transcript buffer when the session closes, so partial captions aren't lost on abrupt exits.
- Debounce flush to one per tick, to avoid redundant writes during rapid caption updates.
```

Trivial one-line changes may skip the body.

<!-- BACKLOG.MD GUIDELINES START -->
<CRITICAL_INSTRUCTION>

## Backlog.md Workflow

This project uses Backlog.md for task and project management.

**For every user request in this project, run `backlog instructions overview` before answering or taking action.**

Use the overview to decide whether to search, read, create, or update Backlog tasks.

Use the detailed guides when needed:
- `backlog instructions task-creation` for creating or splitting tasks
- `backlog instructions task-execution` for planning and implementation workflow
- `backlog instructions task-finalization` for completion and handoff

Use `backlog <command> --help` before running unfamiliar commands. Help shows options, fields, and examples.

Do not edit Backlog task, draft, document, decision, or milestone markdown files directly. Use the `backlog` CLI so metadata, relationships, and history stay consistent.

</CRITICAL_INSTRUCTION>
<!-- BACKLOG.MD GUIDELINES END -->

## Findings During Execution

If work on a task surfaces something out of scope that deserves investigation, don't expand the current task. Create a Backlog draft (or a task, for clear bugs), reference it in the current task's implementation notes, and flag it to the user at wrap-up. If a finding invalidates the current task's plan or acceptance criteria, surface it immediately and update the task. Only interrupt mid-task for blockers.
