---
layout: layouts/base.njk
title: Sky
description: "Moon phase, NASA Astronomy Picture of the Day, and ISS live position — Bindow"
---

<section class="intro">
<p><mark>The sky is always doing something beautiful</mark> — here is what it is doing right now.</p>
</section>

<article class="home-section">
<h2 class="section-heading">
<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2"/><path d="M2 12h20"/></svg>
Moon tonight
</h2>

<div class="moon-panel">
  <div class="moon-vis">
    <svg id="moon-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Moon phase diagram" role="img"></svg>
  </div>
  <div class="moon-copy">
    <p class="moon-name" id="moon-name">—</p>
    <p class="moon-illum" id="moon-illum">—</p>
    <div class="moon-next">
      <p id="next-full">—</p>
      <p id="next-new">—</p>
    </div>
  </div>
</div>
</article>

<article class="home-section">
<h2 class="section-heading">
<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
Astronomy Picture of the Day
</h2>

<div id="apod-container" class="apod-container">
  <p class="climate-loading apod-loading-text">Loading today's picture from NASA…</p>
</div>
</article>

<article class="home-section">
<h2 class="section-heading">
<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>
Space stations · live
</h2>

<div class="stations-grid">
  <div class="iss-card content-card">
    <div class="iss-header">
      <span class="live-dot iss-dot" id="iss-dot" aria-hidden="true"></span>
      <span class="iss-eyebrow">ISS · NORAD 25544 · updates every 5 s</span>
      <span class="iss-ts" id="iss-ts">—</span>
    </div>
    <div class="iss-grid">
      <div class="iss-stat"><strong id="iss-lat">—</strong><span>Latitude</span></div>
      <div class="iss-stat"><strong id="iss-lon">—</strong><span>Longitude</span></div>
      <div class="iss-stat"><strong id="iss-alt">—</strong><span>Altitude</span></div>
      <div class="iss-stat"><strong id="iss-vel">—</strong><span>Velocity</span></div>
      <div class="iss-stat"><strong id="iss-vis">—</strong><span>Visibility</span></div>
    </div>
  </div>

  <div class="iss-card content-card">
    <div class="iss-header">
      <span class="live-dot css-dot" id="css-dot" aria-hidden="true"></span>
      <span class="iss-eyebrow">CSS · Tiangong · NORAD 48274</span>
      <span class="iss-ts" id="css-ts">Orbital catalog</span>
    </div>
    <div class="iss-grid">
      <div class="iss-stat"><strong id="css-alt">—</strong><span>Altitude</span></div>
      <div class="iss-stat"><strong id="css-vel">—</strong><span>Velocity</span></div>
      <div class="iss-stat"><strong id="css-period">—</strong><span>Period</span></div>
      <div class="iss-stat"><strong id="css-incl">—</strong><span>Inclination</span></div>
      <div class="iss-stat"><span class="css-no-live">No live API</span><span>Position</span></div>
    </div>
  </div>
</div>
</article>

<article class="home-section">
<h2 class="section-heading">
<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20"/><path d="M2 12h20"/><path d="M12 2a14.5 14.5 0 0 1 0 20"/></svg>
Orbital ground tracks
</h2>

<div class="content-card orbit-map-wrap">
  <canvas id="orbit-map" class="orbit-map" aria-label="World map showing ISS and CSS Tiangong orbital ground tracks"></canvas>
  <div id="orbit-tooltip" class="orbit-tooltip"></div>
  <div class="orbit-legend">
    <span class="orbit-legend-item"><span class="orbit-dot" style="background:#44aaff"></span>ISS (live)</span>
    <span class="orbit-legend-item"><span class="orbit-dot" style="background:#ff8844"></span>CSS · Tiangong (estimated)</span>
    <span class="orbit-legend-item"><span class="orbit-dot term-dot"></span>Day/night line</span>
    <span class="orbit-legend-note">ISS track live · CSS orbit pattern estimated · hover ISS dot for telemetry</span>
  </div>
</div>
</article>

<script defer src="/js/astronomy.js"></script>
