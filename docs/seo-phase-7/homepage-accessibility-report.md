# Homepage Accessibility Report

Review date: 2026-07-21.

## Scores

| Context | Mobile Accessibility | Desktop Accessibility |
| --- | ---: | ---: |
| Baseline production median | 94 | 94 |
| Post-change local median | 100 | 100 |
| Preview spot check | 100 | 100 |
| Production spot check | 100 | 100 |

## Fixes

- Removed a mismatched header brand aria-label that caused the accessible name to differ from visible text.
- Preserved semantic navigation, buttons, and visible CTAs.
- Kept mobile viewport scalable by removing restrictive maximum-scale=1,user-scalable=no.
- Added dimensions/alt handling to optimized images without changing the visible design.

## Remaining Manual QA

Automated Lighthouse accessibility is passing at 100 for the homepage, but manual keyboard/screen-reader checks should still be part of release QA for authenticated app flows.
