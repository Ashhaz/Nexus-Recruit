# AI Workflow Rules

## 1. Role of the AI Agent

Act as an implementation engine inside an already-defined system.

Do not redesign the product unless explicitly asked.

The developer is the architect. Execute documented decisions rather than inventing replacements.

## 2. Read Context First

Before implementation:

1. Read `AGENTS.md` or the equivalent entry-point instructions.
2. Read all relevant context files.
3. Read the current feature spec.
4. Read the existing implementation related to the feature.
5. Check `progress-tracker.md`.

Do not begin coding from the user's feature sentence alone.

## 3. One Unit at a Time

- Implement one spec unit at a time.
- Do not combine unrelated UI, database, authentication, and analytics work unless the spec explicitly requires it.
- Do not build future features "while you are here."
- Do not add speculative dependencies.

## 4. Scope Control

If the requested change is outside the current spec:

- Stop.
- Identify the scope conflict.
- Do not implement the extra change automatically.

If the change is necessary to make the current unit work, explain it and keep the change minimal.

## 5. Missing Requirements

If a requirement is genuinely ambiguous and could change architecture or behavior:

- Do not guess.
- State the ambiguity.
- Ask for a decision before making the architectural choice.

If the ambiguity is minor and an existing project convention clearly resolves it, follow that convention.

## 6. Existing Code

Before replacing a module:

- Inspect it.
- Understand its dependencies.
- Preserve working behavior.
- Avoid rewriting it simply because a different approach looks cleaner.

## 7. Authentication and Security

Treat these as protected boundaries:

- credentials,
- sessions,
- roles,
- interviewer identity,
- applicant ownership/state,
- room occupancy,
- interview mutations.

Never weaken server-side checks to make a UI flow easier.

## 8. UI Work

For UI changes:

- Read `ui-context.md`.
- Reuse existing components.
- Preserve responsive behavior.
- Implement loading, empty, error, and success states.
- Do not introduce arbitrary colors, radii, typography, or icon styles.

## 9. Verification

Before marking a unit complete:

- Run the relevant checks.
- Test the primary success path.
- Test the most important failure path.
- Check browser console/runtime errors.
- Check responsive behavior where applicable.
- Confirm existing functionality was not broken.
- Update `progress-tracker.md`.

## 10. Documentation Synchronization

If implementation changes:

- architecture → update `architecture.md`
- product scope → update `project-overview.md`
- coding conventions → update `code-standards.md`
- UI system → update `ui-context.md`
- workflow → update `ai-workflow-rules.md`

Do not let documentation silently become false.

## 11. Completion Rule

A unit is complete only when:

- Its spec is implemented.
- Its verification checklist passes.
- No known critical error remains.
- Progress tracker is updated.

## 12. Git Rule

Use focused commits/branches when the repository workflow supports them.

Do not mix unrelated feature changes into the same implementation commit.

## 13. Correction Prompt Rule

When fixing a defect, prefer:

> Expected: [spec behavior]
> Current: [actual behavior]
> Fix only this behavior.
> Do not change unrelated code.

Do not use broad "fix everything" prompts for a localized defect.
