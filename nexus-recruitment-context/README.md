# NEXUS Recruitment Context Package

This package was created using the Six-File Context System described in the supplied AI development playbook.

## Included

- `AGENTS.md` — entry point for AI coding agents
- `CLAUDE.md` — equivalent entry point for Claude Code
- `context/project-overview.md`
- `context/architecture.md`
- `context/code-standards.md`
- `context/ai-workflow-rules.md`
- `context/ui-context.md`
- `context/progress-tracker.md`
- `context/specs/00-build-plan.md`
- `context/specs/01...12...md` — implementation units

## Important

The context is intentionally scoped to the NEXUS recruitment-cycle application. It preserves the known product decisions:

- Google Form → Google Sheets → MongoDB applicant pipeline
- one admin account
- exactly three interviewer accounts
- interviewer-selected rooms
- interviewer-selected applicants
- session-derived interviewer identity
- evaluation and final decisions
- Approved / Pending / Discussion Needed
- results, analytics, settings, testing, deployment

Before using this package against the actual repository, compare the architecture and code standards with the current source tree and adjust only where the repository contains a confirmed implementation difference.
