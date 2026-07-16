# Project Rules

## Before starting

- Read `PROJECT_STATE.md`.
- Read the current task linked from `docs/tasks/README.md` when one exists.
- Read only directly related specs and ADRs.
- Do not read the entire repository documentation unless the task requires it.

## Scope

- Keep one task focused on one observable objective.
- Do not modify unrelated files.
- Do not perform cleanup or refactoring as a side effect.
- Do not add dependencies without explaining the reason and impact.
- Preserve existing observable behavior unless the task explicitly changes it.

## Implementation

- Prefer explicit data flow and small functions.
- Group parameters only when they share responsibility and lifetime.
- Do not create a generic framework for a single use case.
- Do not hide format-specific behavior behind an overly generic abstraction.
- Use the existing staged commit path for final user-visible file outputs.

## Tests

- Define the expected behavior before implementation.
- Tests and implementation may be completed in the same task.
- Prefer behavior tests and real fixtures.
- Preserve existing regression coverage.
- Run relevant tests and formal checks before completion.

## Safety

- Do not bypass workspace path validation.
- Do not bypass staging, Safe Mode, rollback, cleanup, or Undo.
- Do not write directly to a user-visible final output when the staged commit path is applicable.
- Cancellation must not commit a new final output after cancellation is requested.

## Refactoring

- Refactor only when it reduces a concrete bug risk, review cost, or repeated change cost.
- Do not refactor only because code could look cleaner.
- Keep abstractions smaller than the duplicated logic they replace.
