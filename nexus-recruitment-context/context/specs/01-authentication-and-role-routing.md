# Unit 01: Authentication and Role Routing

## Goal

Verify and complete authentication so one admin account and exactly three interviewer accounts can sign in and reach the correct dashboard.

## Design

Keep the existing login UI unless it fails the requirements. Make the role result clear without exposing credentials.

## Implementation

### Authentication

- Support one admin identity.
- Support exactly three interviewer identities.
- Use the existing project session/authentication mechanism.
- Do not expose passwords to the client.

### Role Routing

- Admin → admin dashboard.
- Interviewer → interviewer dashboard.
- Reject protected routes for unauthenticated users.
- Reject interviewer access to admin-only routes.

### Session Identity

- Store enough session information to identify the authenticated role and interviewer.
- Interviewer mutations must derive identity from the session.

## Dependencies

- Existing authentication/session implementation.

## Verify when done

- [ ] Admin login works.
- [ ] All three interviewer accounts work independently.
- [ ] Role redirects work.
- [ ] Unauthenticated protected routes are blocked.
- [ ] Interviewer cannot access admin-only routes.
- [ ] No credentials are exposed in browser-visible data.
