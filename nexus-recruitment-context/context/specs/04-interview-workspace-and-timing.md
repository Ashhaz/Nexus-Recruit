# Unit 04: Interview Workspace and Timing

## Goal

Create the focused interviewer workspace for conducting an active interview and tracking its start/end state.

## Design

Keep current applicant, interviewer, room, status/time, and interview controls visible.

## Implementation

### Workspace

- Show interviewer identity from session.
- Show selected room.
- Show current applicant.
- Show submitted applicant responses.

### Timing

- Record interview start time server-side.
- Show elapsed/active status in the UI.
- Support interview completion state.

## Dependencies

- Unit 03.

## Verify when done

- [ ] Active interview opens correctly.
- [ ] Correct interviewer is shown.
- [ ] Correct room is shown.
- [ ] Correct applicant is shown.
- [ ] Start time is persisted.
- [ ] Interview state updates correctly.
