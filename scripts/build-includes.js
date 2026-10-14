#!/usr/bin/env node
/* ============================================================
   DIGITAL GROWTHSCALE — SHARED INCLUDES BUILD
   ------------------------------------------------------------
   Single source of truth for the site navbar + footer.

   Edit ONLY these two files:
     includes/navbar.html   (the <header class="dgs-header"> block)
     includes/footer.html   (the <footer class="dgs-footer"> block)

   Then run:
     npm run build:includes

   This script expands those includes into every content page,
   in place, between marker comments:

     <!-- dgs:include:navbar:start ... -->
     ...navbar markup...
     <!-- dgs:include:navbar:end -->

   It is idempotent: the first run replaces each page's existing
   <header>/<footer> block with the shared version wrapped in
   markers; every later run just refreshes the content between
   the markers. Netlify runs it on every deploy (see netlify.toml)
   so the published HTML is always in sync with includes/.

   Pages are targeted automatically: any *.html that contains a
   <header class="dgs-header"> gets both the shared navbar and
   footer, EXCEPT the files listed in EXCLUDE below.
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

/* Pages intentionally left alone (they have their own bespoke chrome). */
const EXCLUDE = new Set([
  'launching-soon.html', // pre-launch teaser: own minimal nav/footer, no dgs-common.css
]);

/* ---- load the source-of-truth partials ---- */
function readInclude(name) {
  const p = path.join(ROOT, 'includes', name);
  if (!fs.existsSync(p)) {
    console.error('Missing include: includes/' + name);
    process.exit(1);
  }
  return fs.readFileSync(p, 'utf8').replace(/\s+$/, '');
}

const PARTS = [
  {
    name: 'navbar',
    html: readInclude('navbar.html'),
    // matches the raw block on a page that has never been processed
    raw: /<header class="dgs-header"[\s\S]*?<\/header>/,
  },
  {
    name: 'footer',
    html: readInclude('footer.html'),
    raw: /<footer class="dgs-footer"[\s\S]*?<\/footer>/,
  },
];

function startMarker(name) {
  return (
    '<!-- dgs:include:' + name + ':start | AUTO-GENERATED from includes/' +
    name + '.html — edit that file, then run: npm run build:includes -->'
  );
}
function endMarker(name) {
  return '<!-- dgs:include:' + name + ':end -->';
}
function block(name, html) {
  return startMarker(name) + '\n' + html + '\n' + endMarker(name);
}
function markerRegex(name) {
  return new RegExp('<!-- dgs:include:' + name + ':start[\\s\\S]*?<!-- dgs:include:' + name + ':end -->');
}

/* ---- walk the project for html pages ---- */
function walk(dir) {
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    if (entry.name === 'includes') continue;   // the source partials themselves
    if (entry.name === 'dashboard') continue;  // app shell, not a marketing page
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out = out.concat(walk(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

let changed = 0;
let unchanged = 0;
const skipped = [];

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (EXCLUDE.has(rel)) { skipped.push(rel + ' (excluded)'); continue; }

  let src = fs.readFileSync(file, 'utf8');

  // Only touch pages that actually carry the shared navbar (raw or expanded).
  const hasNavbar = markerRegex('navbar').test(src) || PARTS[0].raw.test(src);
  if (!hasNavbar) { skipped.push(rel + ' (no dgs-header)'); continue; }

  const before = src;
  for (const part of PARTS) {
    const fresh = block(part.name, part.html);
    const mre = markerRegex(part.name);
    if (mre.test(src)) {
      src = src.replace(mre, () => fresh);          // refresh between markers
    } else if (part.raw.test(src)) {
      src = src.replace(part.raw, () => fresh);      // first-time: wrap raw block
    }
    // else: this part isn't on the page; leave it be.
  }

  if (src !== before) {
    fs.writeFileSync(file, src);
    changed++;
    console.log('updated  ' + rel);
  } else {
    unchanged++;
  }
}

console.log(
  '\nInclude build complete: ' + changed + ' updated, ' + unchanged +
  ' already current, ' + skipped.length + ' skipped.'
);
if (skipped.length) console.log('Skipped:\n  ' + skipped.join('\n  '));
