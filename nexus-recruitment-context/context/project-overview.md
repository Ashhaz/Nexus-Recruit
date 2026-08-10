# Project Overview — NEXUS Recruitment & Interview Management System

## 1. Overview

The NEXUS Recruitment & Interview Management System is an internal web application for managing the SCET–NEXUS Coding Club recruitment cycle. It centralizes applicant data imported from Google Sheets into MongoDB, gives the admin a controlled view of recruitment progress, and provides interviewers with a dedicated workspace for selecting applicants, conducting interviews, recording evaluations, and submitting final decisions. The system is designed for the current recruitment cycle rather than as a public, long-term SaaS product.

The application replaces a fragmented recruitment workflow with one controlled internal interface while preserving the existing Google Form → Google Sheets → MongoDB intake pipeline.

## 2. Goals

1. Maintain a single MongoDB-backed applicant database for the recruitment cycle.
2. Provide an admin dashboard for recruitment monitoring and management.
3. Provide exactly three interviewer accounts with role-based access.
4. Allow interviewers to choose their own interview room.
5. Allow interviewers to select applicants themselves; the admin does not assign applicants.
6. Show the applicant's stored Google Form/Google Sheets responses during the interview workflow.
7. Record interview start/end information and evaluation data.
8. Support the final interview decision states: Approved, Pending, and Discussion Needed.
9. Provide results and analytics for recruitment monitoring.
10. Keep the system simple, reliable, and appropriate for a one-cycle internal deployment.

## 3. Primary Users

### Admin

The admin manages and monitors the recruitment system. The admin can access administrative dashboards, applicant data, recruitment results, analytics, and system settings that are intentionally exposed by the application.

The admin does not assign applicants to interviewers and does not manually allocate interview rooms.

### Interviewer

There are exactly three interviewer accounts. An interviewer authenticates with their assigned credentials, chooses an available interview room, selects an applicant, views the applicant's submitted information, starts the interview, records the evaluation, chooses a final decision, and finishes the interview.

## 4. Core User Flow

### Applicant intake

1. Applicant submits the recruitment Google Form.
2. Google Form stores the response in Google Sheets.
3. The existing import/synchronization process brings applicant information into MongoDB.
4. The applicant becomes available in the recruitment application.

### Admin flow

1. Admin signs in.
2. Admin is redirected to the admin dashboard.
3. Admin monitors applicant and recruitment statistics.
4. Admin can inspect recruitment results and analytics.
5. Admin can use the available settings/admin controls.
6. Admin does not assign rooms or applicants.

### Interviewer flow

1. Interviewer opens the login page.
2. Interviewer signs in with one of the three interviewer credentials.
3. The system identifies the interviewer from the authenticated session.
4. Interviewer enters the interview workspace.
5. Interviewer chooses an available room.
6. Interviewer selects an applicant who is eligible for interview.
7. Applicant details and stored form responses are displayed.
8. Interviewer starts the interview.
9. Interview time/status is tracked.
10. Interviewer records evaluation information.
11. Interviewer selects one decision:
   - Approved
   - Pending
   - Discussion Needed
12. Interviewer finishes the interview.
13. The interview record and decision are stored.
14. Interviewer can move to the next eligible applicant.

## 5. Core Features

### Authentication

- One admin login.
- Exactly three interviewer IDs/passwords.
- Role-based redirect after login.
- Session-based interviewer identity.
- Protected admin and interviewer routes.
- Interviewer identity must not be trusted from a form field or URL parameter.

### Applicant Database

- MongoDB-backed applicant records.
- Applicant information imported from Google Sheets.
- Applicant records are searchable/viewable by the recruitment workflow.
- Existing applicant data should be preserved during feature development.

### Admin Dashboard

- Recruitment statistics.
- Applicant monitoring.
- Interview/result visibility.
- Results module.
- Analytics module.
- Settings/admin controls.

### Interviewer Dashboard

- Current interviewer identity.
- Room selection.
- Eligible applicant selection.
- Applicant details.
- Google Sheets response visibility.
- Interview start/status.
- Evaluation.
- Final decision.
- Finish interview.
- Next applicant workflow.

### Results

The results area provides the recruitment outcome view, including final decision states and relevant applicant/interview information.

### Analytics

The analytics area provides useful recruitment-cycle statistics derived from stored application/interview data. It should focus on information that helps the admin understand recruitment progress rather than becoming a generic analytics platform.

### Settings

Settings are restricted to the system controls actually required by this recruitment application. Do not add generic SaaS settings without a requirement.

## 6. Decision States

The interview decision values are exactly:

- `Approved`
- `Pending`
- `Discussion Needed`

Do not rename these states without an explicit product decision.

## 7. In Scope

- Authentication and role routing.
- Admin dashboard.
- Three interviewer accounts.
- Applicant database.
- Google Sheets → MongoDB applicant pipeline.
- Room selection.
- Applicant selection by interviewers.
- Interview workspace.
- Interview timing/status.
- Evaluation.
- Final decision.
- Results.
- Analytics.
- Settings/admin polish.
- Final testing.
- Deployment preparation.

## 8. Out of Scope

Unless explicitly requested later, do not build:

- Public applicant registration inside this application.
- A public job/recruitment marketplace.
- Applicant self-service dashboards.
- Automated admin assignment of rooms.
- Automated admin assignment of applicants.
- More than three interviewer accounts.
- A general-purpose HR/recruitment SaaS.
- Payment processing.
- Complex external messaging systems.
- Unrelated AI features.
- A replacement for Google Forms as the applicant intake interface.

## 9. Success Criteria

The project is complete when:

- Admin can authenticate and reach the admin dashboard.
- Each of the three interviewer accounts can authenticate independently.
- Role-based redirects work correctly.
- Interviewer identity is derived from the authenticated session.
- An interviewer can choose a room without admin assignment.
- An interviewer can select an eligible applicant.
- Applicant information and stored form responses are available during the interview.
- Interview start/status information is recorded correctly.
- Evaluation can be recorded.
- One of the three valid final decisions can be saved.
- The completed interview is reflected in results.
- Analytics reflect stored recruitment data.
- Unauthorized users cannot access protected areas.
- The existing applicant data remains intact.
- Final testing passes without critical errors.
- The application can be deployed for the recruitment cycle.

## 10. Current Product Boundary

This system should be treated as a focused internal recruitment-cycle application. Prefer reliable, understandable implementation over unnecessary abstraction or long-term enterprise infrastructure.
