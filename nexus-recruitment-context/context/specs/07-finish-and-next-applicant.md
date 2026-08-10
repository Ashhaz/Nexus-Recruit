# Unit 07: Finish Interview and Next Applicant

## Goal

Complete the active interview safely and return the interviewer to the next eligible applicant workflow.

## Design

Completion should clearly communicate that the current interview has ended.

## Implementation

### Finish

- Record end time.
- Mark interview completed.
- Preserve evaluation and decision.

### Next Applicant

- Return to the eligible applicant selection flow.
- Do not automatically assign an applicant unless the product already explicitly supports that behavior.

## Dependencies

- Unit 06.

## Verify when done

- [ ] End time is stored.
- [ ] Interview becomes completed.
- [ ] Evaluation remains intact.
- [ ] Decision remains intact.
- [ ] Completed applicant no longer appears as actively interviewable.
- [ ] Interviewer can proceed to another eligible applicant.
