# AURUM — Sell Courses Landing Page

A clean, responsive landing page for a tattoo & permanent-makeup removal
specialist selling educational courses, with an interactive ROI calculator.
Pure HTML/CSS/vanilla JS — no build step.

## Structure

```
index.html                  page skeleton (sections rendered from config)
css/style.css               design system (dark/light themes, gold accents)
js/app.js                   config loader + all interactivity
data/config.json            ALL site content — edit this, not the HTML
assets/icons/               logo, favicon, SVG icons
assets/images/author/       author photo(s)
assets/images/courses/      course media
assets/images/testimonials/ client avatars
.github/workflows/pages.yml GitHub Pages deploy
```

## Editing content

Everything the visitor sees — navigation labels, hero text, author bio,
course modules/pricing, calculator labels and defaults, questionnaire steps,
testimonials, footer — lives in `data/config.json`. Change values there; no
HTML/JS edits needed.

## Theme

Light/dark toggle sits in the header (top right). Default theme is set by
`theme.default` in the config; the visitor's choice persists in localStorage
(`theme.storageKey`).

## ROI calculator

Laser cost + a dynamic list of services (price, procedures per week/month,
consumables, duration) → monthly profit, weekly workload, payback period,
break-even date, and a cumulative-profit chart. All in `data/config.json`
under `calculator.defaults`.

## Google Analytics

Set `analytics.ga4MeasurementId` (e.g. `G-ABC123DEF4`) and
`analytics.enabled: true` in `data/config.json`. The gtag.js snippet is
injected only when enabled and a real ID is set.

## GitHub Pages

Push to `main`, then in repo **Settings → Pages** choose **GitHub Actions**
as the source. The included workflow publishes the repo root on every push.
All asset paths are relative, so a project page under
`/<user>.github.io/<repo>/` works out of the box.

## Local preview

Any static server works, e.g.:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
