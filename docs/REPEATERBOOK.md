# RepeaterBook integration — pending API approval

This release contains a disabled workflow preview. No API calls, token collection, bundled dataset or proxy. It does not imply endorsement or approval.

Proposed purpose: import user-selected channels into a Baofeng Mini 5 configuration. No public directory, map, mirror, bulk export, re-serving or secondary API.

Proposed review limits (not active): explicit user action using ZIP code, 25-mile radius, maximum 50 results, one concurrent request and one request per minute. Only 2 m/70 cm entries explicitly supporting analog FM and confirmed on air qualify. Unknown mode/status and offline entries are excluded. No automatic pagination or background refresh. Duplicate suppression and 429/backoff behavior must follow approved limits.

Users select channels and a starting slot, preview changes, and resolve occupied slots before import. No reserved simplex channels. Import never writes the radio automatically.

Before implementation, obtain approval for app identity, endpoint/fields/limits, CORS, browser-compatible identification (browser JavaScript cannot control User-Agent), per-user app-bound tokens, retention and CPS export. Do not bypass identification requirements with a generic proxy. Never embed a shared app token in source/client code.

Proposed user tokens stay in tab memory, are never logged/stored, and are transmitted only by an explicit authorized request using the approved method. Final behavior must follow actual approval. Results should be transient and cleared at session end; never cache or re-serve across users.

Wherever data is shown/delivered, display **Data courtesy of RepeaterBook.com.** Link to source detail pages where practical and https://www.repeaterbook.com. Native DAT has no attribution field, so export rights and a companion attribution approach must be agreed before enabling import.

Free, open-source, noncommercial hobby project by K4RJM. No paid access or commercialization planned.
