# Unit 09: Analytics Completion

## Goal

Provide useful recruitment-cycle analytics derived from the actual stored data.

## Design

Analytics should answer operational questions rather than become a generic BI system.

## Implementation

### Metrics

Use metrics supported by the existing data, such as:

- total applicants,
- interview progress,
- approved count,
- pending count,
- discussion-needed count,
- completed interviews,
- room/interviewer activity where meaningful.

Do not fabricate unavailable metrics.

## Dependencies

- Unit 08.

## Verify when done

- [ ] Metrics are calculated from stored data.
- [ ] Counts match results.
- [ ] Empty states work.
- [ ] Analytics do not expose unauthorized data.
