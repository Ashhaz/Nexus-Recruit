# Unit 12: Deployment Preparation

## Goal

Prepare the recruitment application for deployment without changing product scope.

## Implementation

### Environment

- Document required environment variables.
- Do not commit secrets.
- Verify production database configuration.

### Build

- Run the production build.
- Verify production startup.
- Verify authentication/session configuration.

### Data

- Confirm the production MongoDB database is the intended database.
- Confirm applicant data is preserved.
- Confirm Google Sheets import/sync configuration if required.

## Dependencies

- Unit 11.

## Verify when done

- [ ] Production build passes.
- [ ] Required environment variables are documented.
- [ ] Secrets are not committed.
- [ ] Authentication works in production configuration.
- [ ] Database connectivity works.
- [ ] Final recruitment flow works in the deployed environment.
