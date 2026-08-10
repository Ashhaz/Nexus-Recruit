# Unit 05: Interview Evaluation

## Goal

Allow the interviewer to record the required evaluation information for the active applicant.

## Design

Evaluation controls should be grouped logically and remain easy to use during an interview.

## Implementation

### Evaluation Form

- Use the existing project evaluation fields where already defined.
- Validate required fields.
- Save evaluation against the active interview/applicant.

### Ownership

- Evaluation mutation must use the authenticated interviewer identity.
- Prevent evaluation updates to an unauthorized interview.

## Dependencies

- Unit 04.

## Verify when done

- [ ] Evaluation form loads.
- [ ] Required validation works.
- [ ] Evaluation saves successfully.
- [ ] Reload preserves saved evaluation.
- [ ] Unauthorized evaluation mutation is blocked.
