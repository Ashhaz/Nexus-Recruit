# UI Context

## 1. Purpose

This file defines the visual and interaction language for the NEXUS Recruitment & Interview Management System.

The UI should feel like an internal technical operations dashboard: clean, focused, modern, readable, and efficient during live interviews.

Do not introduce a completely different visual language on individual pages.

## 2. Visual Direction

- Professional technical dashboard.
- Clear information hierarchy.
- Low visual noise.
- Strong status visibility.
- Fast scanning during interviews.
- Responsive for desktop/laptop use.
- Avoid decorative UI that interferes with interview work.

## 3. Layout Principles

### Admin

Use a dashboard structure with:

- persistent navigation where the existing application supports it,
- summary/stat cards,
- tables/lists for applicant and result data,
- clear filters/search where required,
- dedicated sections for results, analytics, and settings.

### Interviewer

Prioritize the active interview task.

Recommended hierarchy:

```text
Interviewer identity / room
        ↓
Current applicant
        ↓
Applicant details + submitted responses
        ↓
Interview controls / timer
        ↓
Evaluation
        ↓
Decision
        ↓
Finish / next applicant
```

The interviewer should not need to navigate through unrelated admin-style screens while conducting an interview.

## 4. Color Tokens

Use the project's existing theme if one already exists. Do not replace it globally during a feature implementation.

Where semantic tokens are needed, use names rather than scattered raw values:

| Token | Meaning |
|---|---|
| `background` | Main application background |
| `surface` | Card/panel background |
| `surface-muted` | Secondary panel/background |
| `text-primary` | Main text |
| `text-secondary` | Supporting text |
| `border` | Standard borders |
| `accent` | Primary interactive accent |
| `success` | Approved/success state |
| `warning` | Pending/warning state |
| `danger` | Destructive/error state |
| `info` | Informational state |

## 5. Decision Status Styling

The three decisions must be visually distinguishable:

- `Approved` → success semantic styling.
- `Pending` → warning semantic styling.
- `Discussion Needed` → attention/info semantic styling.

Do not rely on color alone. Include text labels/icons where appropriate.

## 6. Typography

- Use the existing project font stack.
- Maintain a clear heading/body hierarchy.
- Avoid excessive font-weight changes.
- Table text must remain readable at normal laptop sizes.

## 7. Components

Prefer reusable:

- Button
- Input
- Select
- Card
- Badge
- Table
- Modal/Dialog
- Tabs
- Toast/Alert
- Empty State
- Loading State
- Error State

If these already exist, reuse them.

## 8. Tables

Admin tables should:

- have clear column labels,
- support readable row density,
- avoid unnecessary columns,
- provide visible status badges,
- remain usable at common laptop widths.

## 9. Interview Workspace

The interview workspace must make the following immediately visible:

- current interviewer,
- selected room,
- current applicant,
- interview status/time,
- relevant applicant responses,
- evaluation controls,
- final decision controls.

Do not hide critical interview controls behind unnecessary navigation.

## 10. Forms

- Labels must be visible.
- Required fields must be obvious.
- Validation errors must appear near the relevant control.
- Submit buttons must show an in-progress state.
- Final decision controls must clearly communicate the selected state.

## 11. Responsive Behavior

The system is primarily intended for laptop/desktop interview use but should remain usable on smaller screens.

Avoid:

- horizontal overflow caused by fixed-width panels,
- overlapping controls,
- text cut-off,
- buttons that become inaccessible,
- tables that destroy the entire page layout.

## 12. Accessibility

- Use semantic HTML where practical.
- Provide accessible labels.
- Maintain keyboard focus behavior.
- Do not rely only on color for state.
- Buttons must have meaningful labels.

## 13. Icons

Use the icon system already used by the project.

Do not introduce multiple icon libraries without an explicit reason.
