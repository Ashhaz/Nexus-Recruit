# Recruitment System Build Plan

## Build Order

| Unit | Feature | Depends On |
|---|---|---|
| 01 | Authentication and role routing verification | Existing application/auth foundation |
| 02 | Interviewer room selection | Unit 01 |
| 03 | Applicant eligibility and interviewer selection | Units 01–02 |
| 04 | Interview workspace and timing | Unit 03 |
| 05 | Evaluation | Unit 04 |
| 06 | Final decision | Unit 05 |
| 07 | Finish interview and next applicant | Unit 06 |
| 08 | Results completion | Unit 07 |
| 09 | Analytics completion | Unit 08 |
| 10 | Settings and admin polish | Units 08–09 |
| 11 | Security, integration, and end-to-end testing | Units 01–10 |
| 12 | Deployment preparation | Unit 11 |

## Ordering Rules

- Authentication/security first.
- Server-side workflow rules before UI wiring.
- UI shells can be verified with existing data before deeper integration.
- Do not introduce dependencies until a unit requires them.
- Preserve the existing Google Form → Sheets → MongoDB pipeline.
- Each unit must have a standalone verification result.

## Definition of Done

Every unit must:

- implement only its defined scope,
- preserve existing working features,
- pass its verification checklist,
- have no known critical runtime errors,
- update `progress-tracker.md`.
