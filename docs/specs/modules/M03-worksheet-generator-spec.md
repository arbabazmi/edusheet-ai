# M03: Worksheet Generator Spec
Status: draft
Priority: P0
Owner: Generator Platform Team

## Scope
- Bank-first worksheet assembly.
- AI generation only for missing questions.
- Validation and storage.
- Structured JSON output for renderers.

## Pipeline
1. Request
2. Question bank lookup
3. Generate missing count
4. Validate
5. Store
6. Return worksheet JSON

## Model Strategy
- Default: low-cost model.
- Fallback: mid-tier model.
- Advanced: premium model only for complex prompts.

## Acceptance Criteria
Given enough bank inventory
When worksheet generation is requested
Then worksheet is assembled without premium generation.

Given insufficient bank inventory
When worksheet generation is requested
Then only missing questions are generated, validated, and stored.
