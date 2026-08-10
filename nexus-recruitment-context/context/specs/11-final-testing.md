# Unit 11: Security, Integration, and End-to-End Testing

## Goal

Verify the full recruitment flow and security boundaries before deployment.

## Test Flow

Google Form → Google Sheets → MongoDB → admin monitoring → interviewer login → room selection → applicant selection → interview → evaluation → decision → completion → results → analytics.

## Security Tests

- [ ] Unauthenticated access is blocked.
- [ ] Interviewers cannot access admin-only features.
- [ ] Interviewer identity cannot be spoofed through client input.
- [ ] Invalid decisions are rejected.
- [ ] Invalid room/applicant states are rejected.

## Functional Tests

- [ ] Applicant import works.
- [ ] Admin dashboard works.
- [ ] All three interviewer accounts work.
- [ ] Room selection works.
- [ ] Applicant selection works.
- [ ] Interview timing works.
- [ ] Evaluation works.
- [ ] Final decisions work.
- [ ] Completion works.
- [ ] Results match interviews.
- [ ] Analytics match stored results.

## UI Tests

- [ ] No critical console errors.
- [ ] No overlapping controls.
- [ ] Loading/error/empty states work.
- [ ] Laptop layout works.
- [ ] Smaller viewport remains usable.
