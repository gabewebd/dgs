# Careers grid — open job postings in a new tab (fix + instructions)

**Goal:** Every job link in the Careers grid (title, "Read More", card image) must open the
full posting in a **new browser tab, outside the iframe** — never load the posting inside the
embedded grid.

---

## 1. How the Careers grid is actually wired

```
careers.html  (our site)
   └── <iframe src="https://digitalgrowthscale.com/careers-source">
              └── careers-source  → served by GoHighLevel (GHL), NOT by this repo
                     └── job cards + "Read More" links  (real <a> tags, no target)
```

Key facts confirmed against the live site:

- The live `https://digitalgrowthscale.com/careers-source` is **rendered by GHL** (blog markup:
  `c-blog-post`, `hl-blog-post-home`, `readme-btn`). It is **not** this repo's
  `careers-source.html`.
- The "Read More" link is a plain `<a href="https://digitalgrowthscale.com/post/…">` with
  **no `target` attribute**, so it navigates inside the iframe.

## 2. Why the parent page can't fix it

`careers.html` contains a script that tries to reach into the iframe and rewrite its links.
That only works when the parent page and the iframe are the **same origin**.

- **Local testing (`file://…/careers.html`):** parent origin is `file://`, iframe origin is
  `https://digitalgrowthscale.com` → **cross-origin**. The browser blocks
  `iframe.contentDocument` for security. The parent script silently does nothing, so links open
  inside the iframe. **This is expected and cannot be coded around from the parent.**
- **Production, if both are served from `digitalgrowthscale.com`:** same-origin, so the parent
  script *can* work — but it is fragile (timing/`load` order, dynamically added cards).

**Conclusion:** the reliable fix must live **inside the page loaded in the iframe** — i.e. the
GHL page. That works in every case (same-origin or cross-origin), because the script runs in the
same context as the links.

## 3. The fix — paste into GHL

In GHL, open the page/funnel that serves **careers-source**, then either:

- **Settings → Tracking Code → Footer**, or
- drop a **Custom Code / Custom HTML** element onto that page,

and paste this block:

```html
<script>
(function () {
  function forceNewTab(a){
    if(!a || a.tagName!=='A') return;
    a.setAttribute('target','_blank');
    a.setAttribute('rel','noopener noreferrer');
  }
  function forceAll(root){
    var links=(root||document).querySelectorAll('a');
    for(var i=0;i<links.length;i++) forceNewTab(links[i]);
  }
  // 1) Rewrite the clicked link in the capture phase, before navigation.
  document.addEventListener('click',function(e){
    var a=e.target.closest && e.target.closest('a');
    if(a) forceNewTab(a);
  },true);
  // 2) Initial pass + watch for dynamically loaded/paginated blog cards.
  function init(){
    forceAll();
    if(window.MutationObserver && document.body){
      new MutationObserver(function(muts){
        for(var m=0;m<muts.length;m++){
          var added=muts[m].addedNodes;
          for(var n=0;n<added.length;n++){
            var node=added[n];
            if(node.nodeType!==1) continue;
            if(node.tagName==='A') forceNewTab(node);
            if(node.querySelectorAll) forceAll(node);
          }
        }
      }).observe(document.body,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  } else { init(); }
})();
</script>
```

Why this is robust:

- **Capture-phase click handler** — the guarantee. Even a card added a split second before the
  click gets `target="_blank"` applied before the browser navigates.
- **Initial `forceAll()`** — stamps every link present at load.
- **MutationObserver** — catches links added later (pagination "Next", async blog rendering).

**Verified:** running this exact logic against the live `/careers-source` flipped all three
anchors (title, "Read More", image) to `target="_blank" rel="noopener noreferrer"`.

## 4. How to verify after pasting

1. Open the **live/staging** Careers page (not the local `file://`).
2. Click "Read More" on a job — it must open the posting in a **new tab**; the grid stays put.
3. Optional: load `https://digitalgrowthscale.com/careers-source` directly, open DevTools, run
   `document.querySelectorAll('a').forEach(a=>console.log(a.target, a.href))` — every anchor
   should print `_blank`.

## 5. Repo status / architecture note

- The identical logic is already in this repo's [`careers-source.html`](../careers-source.html).
  If you ever switch `/careers-source` to be served by this Netlify build (it is already
  rewritten in `netlify.toml`), the fix ships automatically — no extra step.
- **Why we don't "embed the GHL blog into the repo file" instead:** GHL does not expose its
  blog list as a drop-in JS embed for external pages. The iframe → GHL page is the standard way
  to surface a GHL blog on a non-GHL site, so the correct place for the fix is the GHL page (this
  doc), not a reimplementation of the job list in the repo.
- The parent-side script in [`careers.html`](../careers.html) can stay as a harmless same-origin
  backstop.
