# Code Standards

## 1. General Principles

- Prefer simple, explicit code over clever abstractions.
- Follow the patterns already present in the repository.
- Do not introduce a second pattern when an existing project pattern already solves the problem.
- Keep components and modules focused on one responsibility.
- Do not duplicate business rules across client and server.
- Keep security-sensitive decisions server-side.

## 2. Next.js / React

- Follow the repository's existing Next.js routing structure.
- Keep server-side logic separate from presentation logic.
- Use client components only where interactivity or browser APIs require them.
- Avoid turning an entire page into a client component unnecessarily.
- Keep data fetching close to the feature boundary while preserving server-side authorization.
- Reuse existing components before creating duplicates.

## 3. Naming

Use clear names that reflect the recruitment domain.

Preferred examples:

- `Applicant`
- `Interviewer`
- `Interview`
- `InterviewStatus`
- `Decision`
- `Room`
- `Evaluation`

Avoid ambiguous names such as:

- `Data`
- `Thing`
- `Info`
- `Temp`
- `Manager` when the domain entity is actually an `Interviewer`.

## 4. Authentication

- Never hard-code credentials into UI components.
- Never send passwords back to the client.
- Never trust a client-provided role.
- Never trust a client-provided interviewer identity for protected mutations.
- Derive the current user from the authenticated session.
- Keep role checks centralized where practical.

## 5. API / Server Logic

Every mutation should:

1. Authenticate the request.
2. Authorize the current role.
3. Validate input.
4. Check relevant current state.
5. Perform the database operation.
6. Return a clear success/error result.

## 6. MongoDB

- Reuse existing connection handling.
- Avoid opening unnecessary database connections per request.
- Preserve existing collection/schema conventions.
- Use stable identifiers.
- Avoid destructive migrations or resets during normal feature development.
- Add indexes only when justified by actual query patterns.

## 7. Interview Workflow

Business rules must be enforced on the server.

Examples:

- A completed interview cannot be started again without an explicit supported flow.
- An unavailable room cannot be silently assigned.
- An applicant already locked into an active interview cannot be simultaneously started by another interviewer.
- Only the valid decision values can be stored.

## 8. UI Components

- Reuse shared buttons, cards, inputs, dialogs, tables, and status badges where available.
- Do not create visually different versions of the same component without a reason.
- Keep loading, empty, error, and success states explicit.
- Make destructive actions confirmable.

## 9. Forms

- Validate required fields.
- Show useful validation feedback.
- Prevent duplicate submissions.
- Disable or otherwise protect submit actions while a mutation is in progress.
- Never rely only on client-side validation.

## 10. Comments

Comment why, not what.

Good:

```text
// Use the session interviewer instead of the submitted interviewerId
// so a client cannot submit an interview under another interviewer's identity.
```

Avoid comments that simply restate the code.

## 11. Error and Logging Rules

- Do not expose credentials, session secrets, or sensitive configuration in errors.
- Use meaningful server logs for debugging.
- Do not log passwords.
- Do not add noisy console logging to production paths.

## 12. Changes

Before modifying an existing module:

- Read the relevant code.
- Identify existing dependencies.
- Preserve working behavior.
- Make the smallest change that satisfies the spec.

Do not refactor unrelated code during a feature implementation.
