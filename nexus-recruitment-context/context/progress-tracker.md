# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Recruitment application completion and final testing

## Current Goal

- Complete the remaining interviewer workflow, evaluation/final decision flow, results/analytics/settings polish, testing, and deployment.

## Completed

- [x] Google Form applicant intake
- [x] Google Sheets applicant source
- [x] MongoDB applicant database
- [x] Applicant database/import pipeline
- [x] Dashboard statistics
- [x] Room assignment/room-selection foundation
- [x] Results MVP
- [x] Analytics foundation
- [x] Settings foundation
- [x] Admin dashboard foundation
- [x] Role model for admin/interviewer
- [x] Authentication direction: one admin plus exactly three interviewer accounts

## In Progress

- [x] Complete interviewer dashboard
- [x] Complete interviewer applicant selection/start flow
- [ ] Complete interview workspace
- [ ] Complete evaluation
- [ ] Complete final decision
- [ ] Complete interview finish/next-applicant flow
- [ ] Finalize Results
- [ ] Finalize Analytics
- [ ] Finalize Settings
- [ ] Admin polish

## Next Up

1. Complete interviewer room selection.
2. Complete applicant selection and concurrency protection.
4. Complete interview workspace and timing.
5. Complete evaluation.
6. Complete final decision with the exact valid states.
7. Complete finish/next applicant behavior.
8. Run integration and end-to-end testing.
9. Final UI/admin polish.
10. Prepare deployment.

## Open Questions

- Confirm the exact existing MongoDB field names before changing schemas.
- Confirm the exact current session implementation before modifying authentication.
- Confirm which existing UI components are considered shared before introducing replacements.
- Confirm the final deployment target and environment-variable configuration before deployment.

## Architecture Decisions

- Google Form remains the applicant intake interface.
- Google Sheets remains the upstream response source.
- MongoDB is the operational application database.
- Next.js is the application framework.
- There is one admin account and exactly three interviewer accounts.
- Interviewer identity comes from the authenticated session.
- Interviewers choose rooms themselves.
- Interviewers choose applicants themselves.
- Admin does not assign rooms.
- Admin does not assign applicants.
- Final decision states are exactly: Approved, Pending, Discussion Needed.
- This application is scoped to the current recruitment cycle rather than a general HR SaaS.

## Session Notes

- Use the context files as the source of truth for implementation decisions.
- When implementation differs from this tracker, update the tracker and relevant context file rather than silently proceeding.
