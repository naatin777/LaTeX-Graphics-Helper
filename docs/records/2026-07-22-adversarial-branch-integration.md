# Adversarial branch integration

## Result

- Integrated branch: `next/adversarial-review-integrated`
- Baseline: `next/v1` at `7f70f6996f9e21fc71a962971e8c0df05b40629f`
- Primary source: `next/v1-adversarial-review-2` at `0dc85e5358fa87133e341b746b61ffdca454b572`
- Additional source: `next/adversarial-review-v2` at `2b9ad3737f1afc9b851fa017d6d6d39f98452881`
- Additional source: `next/adversarial-input-hardening` at `0b936ec5a12b4b14b6930ff14f93b9896d6f62d8`

The integrated branch preserves the broad audit fixes from `next/v1-adversarial-review-2`, then incorporates the streaming input-preflight implementation, adversarial regression coverage, and historical review record from `next/adversarial-review-v2`.

## Conflict resolution

The three branches changed the same preflight and EPS areas in incompatible ways. The integrated result uses the following resolution:

- keep the broader conversion, rollback, output-validation, SVG-network, LaTeX-escaping, localization, specification, and test changes from `next/v1-adversarial-review-2`
- inspect SVG, Mermaid, and native Draw.io text with streams instead of loading the complete file into memory
- use bounded prefix reads for PDF and EPS headers
- use Sharp metadata from file paths and explicitly close Sharp inputs
- preserve regular-file validation and source-path diagnostics
- preserve backend-driven resource handling without restoring the arbitrary 500 MB or 100 MP preflight policy
- preserve the safe-integer EPS validation from the broader audit branch rather than the narrower 32-bit and dimension limits
- add adversarial tests for multi-chunk Mermaid input, SVG dimensions, a Draw.io marker split across stream chunks, editable Draw.io binary input, and multi-input diagnostics

The original three source branches were left unchanged. This is a content-level integration branch; the source branch commit graphs were not rewritten.

## Validation

The integrated branch is 33 commits ahead of the fixed `next/v1` baseline after the integration commits. Local `npm` checks were not run because this environment does not have a repository checkout or working GitHub network access. GitHub commit status contexts were not available through the connected status endpoint at the time of integration.
