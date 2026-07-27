# CLAUDE.md

## Questions open a discussion, not work

When the user asks a question ("what do you think?", "should we...?", "is this worth...?"), the deliverable is your assessment — answer and discuss, and do not start doing whatever the question suggests. Act only after an explicit request.

## Code changes require a Backlog task

Every code change, however small, must be tied to a Backlog task — if none exists, create one before touching code. This overrides the Backlog overview's "skip task creation for obvious mechanical edits" guidance for code; docs-only edits are exempt. Release/version tagging and the accompanying `package.json` version bump are also exempt — the git tag is its own record.

## Branching

Implement each Backlog task on its own branch named after the task id (e.g. `gmc-999`), branched from `main`. When the task is done, merge with `git merge --no-ff` into `main`.

Branch *before you start the work* — before setting the task In Progress or making the first code commit — **not** before creating the task. Registering a demand (creating the task) and starting work (creating the branch) are separate events with separate homes: a cold task is created on `main`, so its id is assigned there and you then `git checkout -b gmc-999` off `main` with the id in hand; a task discovered mid-work on another branch may be created on that branch instead (see "Findings During Execution"). The `backlog` CLI consolidates tasks across active branches, so a task created on a branch stays visible before the merge.

What must never land on `main` is In-Progress/code work. The first *progress* edit (setting In Progress) autocommits immediately, so the branch has to exist before that — the In Progress edit, not the create, is the gate.

Mark the task Done only after the merge: code commits and in-progress task updates go on the branch, then merge into `main`, then set the task to Done (plus finalization notes) and commit that on `main`. Done means the work is reachable from `main`.

The `backlog` CLI auto-commits its task-file changes to the current branch (`autoCommit: true` in the backlog config) — never stage `backlog/` files manually, and be on the intended branch before the In Progress edit, since the commit lands immediately.

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

## Marking acceptance criteria

Checking an AC asserts it is true — so name the specific evidence for *that* AC when you check it. A green test suite is not evidence for an AC it does not exercise; "all tests pass" only counts when you name *which* test covers *which* AC.

Three kinds of AC, by what proves them:

- **Static** — the proof is the diff, file, or line (e.g. "the prompt no longer forbids X", "no new code"). Verify by pointing at it.
- **Automatable** — the proof is a test that goes red if the behavior breaks.
- **Behavioral/empirical** — the behavior only exists at runtime (an LLM obeying a prompt, a network/clock/hardware effect); no unit test touches it. The proof is a recorded observation. Record the method and n (e.g. "verified n=2, non-deterministic: sonnet + go-qwen, both reappeared") and the regression mechanism (prompt-governed → may break with no test going red).

n=0 disguised as green is the exact failure this prevents: never check a behavioral AC just because the mechanics tests pass.

## Findings During Execution

If work on a task surfaces something out of scope that deserves investigation, don't expand the current task. Create a Backlog draft (or a task, for clear bugs), reference it in the current task's implementation notes, and flag it to the user at wrap-up. If a finding invalidates the current task's plan or acceptance criteria, surface it immediately and update the task. Only interrupt mid-task for blockers.
