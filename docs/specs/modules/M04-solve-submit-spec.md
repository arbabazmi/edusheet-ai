# M04: Solve and Submit Spec
Status: draft
Priority: P1
Owner: Solve Team

## Scope
- Timed and untimed solve flows.
- Answer capture and submission.
- Server-side scoring and result breakdown.

## Functional Requirements
1. Render questions without answers.
2. Timed mode must auto-submit at zero.
3. Submit must return total score, percentage, and per-question results.
4. Authenticated submissions must be linked to user identity.

## API Surface
- `GET /api/solve/:worksheetId`
- `POST /api/submit`

## Acceptance Criteria
Given timed mode is selected
When countdown reaches zero
Then worksheet auto-submits with available answers.

Given valid answers are submitted
When scoring completes
Then response includes score summary and per-question correctness.
