# next/v1 adversarial review v2

> Historical record from `next/adversarial-review-v2`. Some follow-up items described here were subsequently resolved by `next/v1-adversarial-review-2` and the integrated branch.

- Base: `next/v1` at `7f70f6996f9e21fc71a962971e8c0df05b40629f`
- Working branch: `next/adversarial-review-v2`
- Scope: read-only repository audit followed by focused, reversible fixes

## Review passes

The repository was reviewed in ten passes.

1. Input and filesystem safety
2. Output conflict, commit, rollback, cleanup, and Undo
3. External process execution and cancellation
4. Format dispatch and output correctness
5. Webview protocol and Content Security Policy
6. Public command IDs, settings, NLS, and compatibility
7. Test runtime, fixtures, and adversarial gaps
8. CI, package, and release evidence
9. Memory, file handles, concurrency, and performance
10. Naming, responsibility, duplication, and maintainability

## Overall assessment

The conversion transaction boundary is stronger than the surrounding preflight layer. Workspace containment, staged output, conflict resolution, backup, rollback, cleanup preservation, and hash-based Undo checks already have explicit implementations and extensive tests. A broad architectural rewrite would add review risk without addressing the most concrete defects.

The first focused correction is input preflight resource handling.

## Confirmed findings

### F-001: arbitrary resource policy in preflight

The preflight implementation rejected files over 500 MB and warned on images over 100 MP. These values were implementation choices rather than user requirements. They also duplicated decisions that belong to the actual decoder, renderer, external tool, or operating environment.

Decision:

- Remove the byte-size rejection.
- Remove the pixel-count warning.
- Continue reporting file size and image dimensions as diagnostics.
- Let the real conversion backend report an actual unsupported-resource failure.

### F-002: preflight loaded complete inputs into memory

`fs.promises.readFile` reads the complete file. The preflight used it for raster inputs, SVG, Mermaid, Draw.io, and EPS even though most checks require only metadata, a header, or streaming text inspection.

Decision:

- Raster and SVG dimensions use Sharp metadata from a file path.
- Text formats are inspected with a read stream.
- PDF and EPS header checks use bounded header reads.
- Editable Draw.io PNG/SVG inputs are not decoded as UTF-8 text.

This is an implementation resource bound, not a product input-size policy.

### F-003: supported-extension directory was not rejected explicitly

A directory named with a supported extension could pass the common `stat` size checks and fail later with a platform-dependent read error.

Decision:

- Require a regular file before format-specific preflight.

### F-004: batch error omitted source-to-reason mapping

When multiple preflight errors occurred, the thrown message joined reasons without their input paths. Similar failures were difficult to attribute.

Decision:

- Include each failing source path with its reason.

### F-005: SVG Puppeteer request policy needs separate hardening

The SVG-to-PDF Puppeteer path currently continues every navigation request and aborts other requests. Puppeteer defines a navigation request as the request driving a frame navigation, so a malicious subframe navigation can be treated as allowed network activity.

Decision:

- Record as a separate focused change because it needs an executable browser regression test or a small testable request-policy boundary.
- Do not mix it into the preflight correction without that evidence.

## Not changed

- Conversion architecture and directory structure
- Safe Mode behavior
- Commit, rollback, cleanup, and Undo semantics
- Public command IDs and setting keys
- Warning confirmation UX from planned task 0204
- PDF deep parsing, Mermaid CLI validation, and Draw.io CLI validation from planned task 0204
- Test runner migration
- Dependency or framework additions

## Added evidence

`test/operations/input_preflight_adversarial.test.ts` covers:

- a large valid Mermaid file is not rejected only because of byte size
- a large-dimension SVG is not rejected only because of pixel count
- Draw.io structure detection across stream chunks
- editable Draw.io PNG bytes are not decoded as UTF-8 text
- a directory with a supported extension is rejected as a non-file
- every failed input path is present in the batch failure

## External references used

- Node.js filesystem documentation: `fsPromises.readFile` reads the entire contents of a file.
- Sharp input metadata documentation: metadata is obtained from the input header without decoding compressed pixel data.
- Puppeteer request interception documentation: every intercepted request must be continued, responded to, or aborted.
- Puppeteer `HTTPRequest.isNavigationRequest`: true for the request driving the current frame navigation.

## Follow-up candidates

1. Add a browser-backed regression test and block all external navigation in SVG rendering.
2. Complete warning confirmation and progress reporting under task 0204.
3. Reconcile the input-preflight specification so it describes backend-driven resource failure rather than fixed byte/pixel limits.
4. Separate packaged-VSIX smoke from the large Electron journey so failures have a clear owner.
