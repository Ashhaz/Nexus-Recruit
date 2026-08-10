# Unit 03: Applicant Eligibility and Interviewer Selection

## Goal

Allow interviewers to select eligible applicants themselves and safely prevent conflicting active interview selection.

## Design

Applicant selection should be fast to scan and should expose enough information to identify the applicant.

## Implementation

### Applicant List

- Load applicants from MongoDB.
- Show relevant identity/status information.
- Exclude applicants who cannot currently be selected.

### Selection

- Interviewer selects an applicant.
- Server validates current applicant state before creating/locking an active interview.

### Applicant Details

- Display stored Google Form/Google Sheets responses relevant to the interview.

## Dependencies

- Units 01–02.
- Existing applicant collection.

## Verify when done

- [ ] Eligible applicants are visible.
- [ ] Interviewer can select an applicant.
- [ ] Applicant details load correctly.
- [ ] Ineligible/active applicants cannot be selected.
- [ ] Concurrent selection is server-validated.
