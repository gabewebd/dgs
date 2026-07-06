# Digital GrowthScale, Landing Page + Lead Dashboard

This folder is a complete, ready to deploy website. It includes the landing page, a thank you page, and a simple password protected dashboard where your two team members can see incoming leads.

## What is inside

```
index.html              The main landing page
thank-you.html          Shown after someone submits the form
dashboard/               The lead dashboard (password protected)
  index.html
  dashboard.js
netlify/functions/       A small server side function the dashboard uses
  get-submissions.js
css/style.css            All colors, fonts, and layout
js/main.js                Menu, FAQ, and scroll animations
images/                   Favicon and social preview graphic
netlify.toml              Netlify configuration, you do not need to edit this
```

## Step 1, deploy to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) and log in or create a free account.
2. Drag this entire folder onto the "Sites" page (look for the drag and drop upload area).
3. Netlify will give you a live URL right away, something like `random-name-123.netlify.app`. You can rename this later under Site settings, or connect your own domain, for example digitalgrowthscale.com.

The form and the thank you page will work immediately after this step. The dashboard needs two more steps below before it will show any leads.

## Step 2, turn on email notifications for new leads

You asked for notifications to go to **projects@digitalgrowthscale.com**. This is set up inside Netlify, not in the code:

1. In your Netlify site, go to **Site settings > Forms > Form notifications**.
2. Click **Add notification > Email notification**.
3. Enter `projects@digitalgrowthscale.com` as the recipient.
4. Save. From now on, every new submission will email that address automatically, in addition to appearing in the dashboard.

## Step 3, set up the lead dashboard

The dashboard lives at `yoursite.netlify.app/dashboard/`. It needs three settings, called environment variables, added once in Netlify.

1. In your Netlify site, go to **Site settings > Environment variables**, and add:

   | Key | Value |
   |---|---|
   | `NETLIFY_ACCESS_TOKEN` | See instructions below to generate this |
   | `NETLIFY_SITE_ID` | Found on the same **Site settings > General > Site details** page, listed as "Site ID" or "API ID" |
   | `DASHBOARD_PASSWORD` | Any password you choose, share it only with the two team members who will use the dashboard |

2. To get `NETLIFY_ACCESS_TOKEN`, go to [app.netlify.com/user/applications](https://app.netlify.com/user/applications), click **New access token**, name it something like "GrowthScale Dashboard", and copy the token into the environment variable above.

3. After adding all three variables, redeploy the site once (Netlify usually prompts you to, or you can trigger it under **Deploys > Trigger deploy**).

4. Visit `yoursite.netlify.app/dashboard/`, enter the password you chose, and your leads will load.

A quick honesty note on security: the dashboard password check happens on Netlify's server, inside `get-submissions.js`, not just in the browser, so it is a real gate, not just a cosmetic one. That said, it is one shared password rather than individual team logins. If you later want separate logins per team member, Netlify Identity can be added on top of this same structure, just let your developer know.

## Editing the content

Open `index.html` in any text editor. Text is written directly between tags, for example:

```html
<h1>Your business has outgrown the way you're currently running it.</h1>
```

Change the words between `<h1>` and `</h1>` to update the headline. The file is commented throughout to mark each section.

## Editing colors and fonts

Open `css/style.css` and look at the very top, inside the `:root { ... }` block. Every color and font used across the whole site is listed there once, so changing a value there updates it everywhere.

## Replacing placeholder images

The founder portrait in the About section and the social preview image are simple illustrated placeholders, not photos, since none were provided and the brief asked not to fabricate proof. Swap them out:

* Founder photo: replace the SVG block inside the `.about-portrait` div in `index.html` with a real `<img src="images/faith-natividad.jpg" alt="Faith Natividad, Founder of Digital GrowthScale">` tag once a photo is available.
* Social preview image (`images/og-cover.svg`): most chat apps and social platforms render PNG or JPG previews more reliably than SVG. If you want the link preview to look right everywhere, export this SVG as a PNG (1200x630px) using Canva or Figma, save it as `images/og-cover.png`, and update the `og:image` line in the `<head>` of `index.html` to point to it.

## Brand reference

This build follows the official DG Brand Guidelines, 2026 Edition:

* Colors: Navy `#08142C`, Teal `#4AA89E`, Mint `#73C8B7`, Gold `#F5C845`, Light `#F5F7F9`, used at roughly the specified 70/20/8/2 ratio. Gold is intentionally rare, it appears only as a single emphasis moment (the "Growth" layer in the hero visual and the accessibility focus ring), not as a general accent.
* Typography: Manrope Bold for display headlines, Manrope Semibold for section headings, Inter Regular for body copy, all loaded from Google Fonts in the `<head>` of each page.
* Logo: the two overlapping circles from the brand book (representing distinct expertise and collaborative synergy) are used as the site favicon, in the header, and in the footer. The standalone mark lives at `images/brand-mark.svg` if you need it elsewhere.
* Voice: copy throughout aims for the brand's "Confident. Clear. Purposeful." direction, active voice, specific claims, no filler or jargon.

## A few honest limitations to know about

* Lead status is currently just "New Lead" for every entry, since that was the only status requested. If you later want statuses like Contacted or Won, that would need a small addition to the dashboard.
* The dashboard shows live data pulled directly from Netlify Forms each time you open it or click Refresh, there is no separate database to keep in sync.
* No pricing is shown anywhere on the site, exactly as requested, it is scoped after an inquiry comes in.

If anything above is unclear, send the file over to whoever manages your Netlify account, everything needed is in this README.
