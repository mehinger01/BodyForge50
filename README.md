# BodyForge50

Adaptive fitness and longevity training for men 50+.

## MVP

BodyForge50 V1 is a zero-build, mobile-first web app designed around a six-week foundation block.

Current features:

- Date-aware daily workout plan starting September 6, 2026
- GREEN / YELLOW / RED readiness assessment
- Automatic reduced-session recommendations
- Strength, mobility, cycling, and progressive walking schedule
- Workout logging for reps, weight, pain, RPE, and recovery
- Missed-day and sick-day guidance
- Daily tracking for weight, resting heart rate, and blood pressure
- Progress dashboard with 7-day weight average and adherence
- User Zero profile and performance goals
- Local JSON data export
- Browser-only persistence via `localStorage`

## Use

Open the deployed GitHub Pages site on a phone or computer. V1 requires no account and no backend.

All data is stored in the current browser. Clearing browser/site data will erase it, so use the Profile → Export data option periodically during testing.

## GitHub Pages

A Pages deployment workflow is included at `.github/workflows/pages.yml`.

In GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions** if it is not already enabled. The workflow will deploy the static site after pushes to `main`.

## Product direction

The MVP is intentionally narrow. User Zero testing should determine requirements for later versions, including cloud sync, authentication, multi-user onboarding, more sophisticated adaptive progression, nutrition support, and AI-assisted coaching.

## Safety

BodyForge50 is a training and tracking tool, not medical diagnosis or treatment. Exercise recommendations should remain conservative and be modified or stopped when symptoms warrant appropriate medical evaluation.
