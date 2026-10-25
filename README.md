# Aakansha Singh · Portfolio

Static portfolio site for UX/UI case studies. No build step.

```
index.html                 home page: intro, project ledger, selected work, approach, about, contact
assets/covers/*.webp       cover images captured from each case study
work/oha-obesity-care.html One Health Assist: medical obesity programme (mobile app)
work/legrand-arteor.html   Legrand Arteor: switch configurator for Saudi Arabia
work/oman-vision-2040.html Oman Vision 2040: holographic touch display for COMEX 2025
```

Each case study page is the original self-contained export with a small
"← All work" link added that points back to `index.html`.

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
```

## Before publishing

- Replace `hello@example.com` and the LinkedIn / Behance links in the contact section of `index.html`.
- The OHA case study ends with placeholders ("Next case study: [Title]", "Contact: [your email]") that come from the original export.

## Deploy

Works as-is on GitHub Pages (Settings → Pages → deploy from branch, root folder), Netlify or Vercel.
