# Tool Security and Privacy Review

Research date: 2026-07-20

Tool: /tools/dating-bio-generator

## Design

- Deterministic browser-side template engine.
- No external AI provider.
- No secret keys.
- No login requirement.
- No network request for user inputs.
- No persistence to localStorage, sessionStorage, cookies, database, or analytics payloads.

## Input safety

- Interests limited to 120 characters.
- Optional personality description limited to 160 characters.
- Angle brackets are stripped.
- Suggestions are rendered with textContent rather than innerHTML.
- A small prohibited-term guard blocks abusive, unsafe, deceptive, underage, and private-detail prompts.
- Empty input shows a user-safe error state.

## Privacy disclosure

The page states that the basic generator runs in-browser, does not save inputs, and does not send inputs to an external AI provider.

## Deferred

- Server-side rate limiting is not required for the current local-only deterministic tool because no request is sent.
- A future AI-powered version must use a server-side function, abuse controls, logging policy, and updated privacy disclosure before launch.
