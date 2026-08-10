# Architecture

## 1. Architectural Summary

The system is a Next.js web application with MongoDB as its application database and Google Forms/Google Sheets as the applicant intake source.

High-level flow:

```text
Google Form
    ↓
Google Sheets
    ↓
Import / Sync
    ↓
MongoDB
    ↓
Next.js Application
    ├── Authentication
    ├── Admin Dashboard
    ├── Interviewer Dashboard
    ├── Applicant Management
    ├── Interview Workflow
    ├── Evaluation / Decisions
    ├── Results
    ├── Analytics
    └── Settings
```

## 2. Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Application | Next.js | Web application, routing, server/client behavior |
| UI | React | Interface components and application screens |
| Styling | Existing project styling system | Layout, responsive design, visual consistency |
| Database | MongoDB | Applicants, interview records, evaluations, decisions, and related system data |
| Applicant intake | Google Forms | Collect recruitment responses |
| Applicant source | Google Sheets | Store form responses before import/sync |
| Development | VS Code / existing project IDE | Development |
| Version control | Git/GitHub | Source control and deployment workflow |

Do not replace the stack unless explicitly instructed.

## 3. System Boundaries

### Authentication boundary

Owns:

- Login.
- Session creation.
- Role identification.
- Protected route enforcement.
- Logout/session termination.

### Admin boundary

Owns:

- Admin dashboard.
- Recruitment monitoring.
- Results.
- Analytics.
- Required settings/admin controls.

It must not own interviewer room/applicant assignment because those are interviewer-driven workflows.

### Interviewer boundary

Owns:

- Interviewer workspace.
- Room selection.
- Applicant selection.
- Interview state.
- Evaluation.
- Final decision.
- Interview completion.

### Applicant boundary

Owns:

- Applicant records.
- Imported Google Sheets data.
- Applicant eligibility/status information.
- Applicant details displayed during interviews.

### Data import boundary

Owns:

- Reading/synchronizing applicant information from Google Sheets.
- Mapping external sheet data into MongoDB.
- Avoiding accidental duplicate applicant creation where the existing implementation already provides an identifier or matching strategy.

## 4. Data Ownership

MongoDB is the application source of truth after applicant data has been imported.

Google Sheets remains the upstream applicant-response source.

The application should not silently overwrite the original Google Sheet.

## 5. Core Data Concepts

The implementation should preserve the project's existing schemas where they already exist. Conceptually, the system needs:

### Applicant

Contains:

- Applicant identity/contact information.
- Recruitment form responses.
- Applicant status/eligibility information.
- Import/source metadata where already implemented.

### Interview

Contains:

- Applicant reference.
- Interviewer reference.
- Room.
- Start time.
- End time/completion state.
- Evaluation data.
- Final decision.
- Relevant timestamps.

### Interviewer

Contains:

- Stable interviewer identifier.
- Display name.
- Role.
- Authentication-related information according to the existing implementation.

### Admin

Contains or represents the administrative identity used by the authentication system.

## 6. Authentication and Access Model

There is one admin account and exactly three interviewer accounts.

After authentication:

```text
Admin       → Admin Dashboard
Interviewer → Interviewer Dashboard
```

The server must enforce role access.

The client UI is not the security boundary.

The interviewer identity used to create/update an interview must come from the authenticated session. A client-provided `interviewerId` must not be accepted as authoritative for protected mutations.

## 7. Room Model

There are exactly three interview rooms.

Room selection is performed by interviewers.

The admin does not assign rooms.

The implementation must prevent two interviewers from incorrectly occupying the same room at the same time if the application requires room availability tracking.

## 8. Applicant Selection Model

Interviewers select applicants themselves.

The admin does not assign applicants.

Applicant selection must respect the current interview state so that an applicant already being actively interviewed cannot be accidentally started by another interviewer.

Where concurrency is possible, server-side validation must be performed at the mutation boundary.

## 9. Interview State

Conceptual lifecycle:

```text
Eligible
   ↓
Selected
   ↓
Interview Started
   ↓
Evaluation
   ↓
Decision
   ├── Approved
   ├── Pending
   └── Discussion Needed
   ↓
Completed
```

The implementation should not allow invalid state transitions.

## 10. API / Server Rules

- Validate all mutation inputs on the server.
- Enforce authentication on protected mutations.
- Enforce role permissions on the server.
- Use MongoDB through the project's established data-access layer.
- Do not duplicate database logic across unrelated UI components.
- Do not expose credentials to the client.
- Do not trust IDs supplied by the browser when the server can derive them from the authenticated session.

## 11. Invariants

1. There are exactly three interviewer accounts.
2. There is one admin role/account for this application.
3. Interviewer identity comes from the authenticated session.
4. Admin does not assign interview rooms.
5. Admin does not assign applicants.
6. The valid decision states are only `Approved`, `Pending`, and `Discussion Needed`.
7. Protected mutations require server-side authentication and authorization.
8. Existing applicant records must not be destroyed or reset during feature work.
9. Google Sheets remains the upstream applicant-response source.
10. MongoDB remains the application's operational data store.
11. Unrelated features must not be introduced into a recruitment-cycle application.
12. UI-only access controls must never be treated as sufficient authorization.

## 12. Error Handling

Errors should be explicit and actionable:

- Unauthorized → require login.
- Forbidden → authenticated but insufficient role.
- Applicant unavailable → show that the applicant has already been taken or is no longer eligible.
- Room unavailable → require another room.
- Validation failure → identify the invalid field/state.
- Database failure → show a safe user-facing error and log technical details without exposing secrets.

## 13. Architecture Change Rule

If a feature requires changing:

- authentication,
- data ownership,
- database schema,
- room concurrency,
- applicant state,
- role permissions,
- or the Google Sheets/MongoDB pipeline,

update this file before implementing the feature.
