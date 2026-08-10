# Unit 06: Final Decision

## Goal

Allow an interviewer to submit exactly one of the three approved final decision states.

## Design

The decision control must make the three states visually distinct and prevent accidental ambiguous submission.

## Implementation

### Decision States

Only allow:

- Approved
- Pending
- Discussion Needed

### Persistence

- Save the decision against the interview/applicant.
- Validate the decision server-side.

## Dependencies

- Unit 05.

## Verify when done

- [ ] All three decision choices are visible.
- [ ] Only valid values can be submitted.
- [ ] Decision persists.
- [ ] Invalid values are rejected server-side.
- [ ] Existing evaluation is preserved.
