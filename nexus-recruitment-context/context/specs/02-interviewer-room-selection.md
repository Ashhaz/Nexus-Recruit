# Unit 02: Interviewer Room Selection

## Goal

Allow an authenticated interviewer to choose one of the three interview rooms without admin assignment.

## Design

Room selection must be prominent before an interview begins.

## Implementation

### Room List

- Present exactly three rooms.
- Clearly show available/unavailable state when the application tracks occupancy.

### Selection

- Save the selected room through a protected server action/API.
- Associate the room with the authenticated interviewer session.

### Concurrency

- Prevent invalid simultaneous room occupation where the existing system requires availability tracking.

## Dependencies

- Unit 01 authentication.
- Existing interview/room data model.

## Verify when done

- [ ] Exactly three rooms are available.
- [ ] Interviewer can choose a room.
- [ ] Admin assignment is not required.
- [ ] Room state is validated server-side.
- [ ] Current interviewer identity comes from session.
