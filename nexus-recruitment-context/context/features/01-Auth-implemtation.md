STOP. The current Clerk login implementation does NOT match the project's requirements.

Do NOT make any further changes until you understand this requirement.

AUTHENTICATION REQUIREMENT:

This is a private recruitment application. There is NO public registration.

There are exactly 4 authorized users:

1. ONE ADMIN
2. INTERVIEWER 1
3. INTERVIEWER 2
4. INTERVIEWER 3

All four users must authenticate using a simple identifier + password login.

The application must NOT provide:

- Google Sign-In
- Google OAuth
- Magic links
- OTP/passwordless authentication
- Public sign-up
- User registration
- Social login
- Any unnecessary authentication methods

The login experience should be a simple NEXUS login page with:

IDENTIFIER / EMAIL
[ input ]

PASSWORD
[ input ]

[ LOGIN ]

IMPORTANT:

We are using Clerk as the authentication provider, but Clerk's default visual SignIn component must NOT dictate the application's login design.

Preserve the existing NEXUS login page design as much as possible and integrate Clerk authentication into it.

First inspect the current Clerk configuration and determine whether the project is configured for:

- email + password
- username + password
- Google/social login
- passwordless authentication

Then configure Clerk for the simplest password-based authentication that satisfies the requirement.

If email + password is the appropriate Clerk configuration, use email + password and remove Google/social/passwordless options.

If username + password is supported and is more appropriate for the requested identifier + password experience, use username + password.

Do NOT create any user accounts automatically in application code.

Do NOT store passwords in MongoDB.

Do NOT hardcode passwords in the frontend.

Clerk must remain responsible for authentication credentials.

The application will later contain exactly four Clerk users:
- Admin
- Interviewer 1
- Interviewer 2
- Interviewer 3

ROLE REQUIREMENT:

The authenticated Clerk user must eventually map to one of these roles:

admin
interviewer

Admin:
- Can access /admin/*
- Cannot access /interviewer/*

Interviewer:
- Can access /interviewer/*
- Cannot access /admin/*

DO NOT implement the full role-routing system yet unless it is already part of the current implementation.

DO NOT modify:
- Applicants
- Interview Rooms
- Results
- Analytics
- Settings
- MongoDB applicant data
- Google Sheets integration
- Interview workflow

CURRENT ISSUE:

/login now displays Clerk's default SignIn UI with "Continue with Google" and other authentication options.

That is NOT the desired product experience.

Fix ONLY the authentication configuration/login experience.

Also investigate the current Clerk 422 errors visible in the browser console and determine whether they are caused by the current authentication configuration.

Do not ignore the 422 errors.

After fixing:

1. /login must load successfully.
2. Login must use the intended identifier + password flow.
3. Google login must not be available.
4. Public sign-up must not be available.
5. No OTP/magic-link login should be available.
6. Existing application functionality must remain untouched.
7. Report exactly which files were changed.
8. Report exactly which Clerk dashboard settings must be configured manually.
9. Do NOT proceed to the next specification.

STOP.