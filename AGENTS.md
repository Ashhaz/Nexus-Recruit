# Application Building Context

Read the following files before implementing or making architectural decisions:

1. `context/project-overview.md` — product definition, goals, features, scope, and workflow
2. `context/architecture.md` — system structure, data flow, storage, authentication, and invariants
3. `context/ui-context.md` — visual system and interface conventions
4. `context/code-standards.md` — implementation and coding rules
5. `context/ai-workflow-rules.md` — AI development workflow and scope rules
6. `context/progress-tracker.md` — current implementation state and next steps

For a feature, also read its corresponding file under `context/specs/`.

## Non-negotiable behavior

- This application is for the NEXUS Coding Club recruitment/interview cycle.
- There are exactly three interviewer accounts plus one admin account.
- The admin does not assign rooms or applicants.
- Interviewers choose their own room and select applicants themselves.
- The interviewer identity used for an interview must come from the authenticated session, not from arbitrary client input.
- Do not replace the existing Google Form → Google Sheets → MongoDB applicant pipeline unless explicitly instructed.
- Do not introduce unrelated product features.
- Do not redesign working modules while implementing an unrelated feature.
- Update `context/progress-tracker.md` after meaningful implementation changes.
- If implementation changes architecture, scope, authentication, data ownership, or UI conventions, update the relevant context file before continuing.

## Working rule

Implement one spec at a time. Verify it before moving to the next spec. Do not silently expand scope.
