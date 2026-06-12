---
layout: layouts/base.njk
title: Climate
description: "Atmospheric CO₂ data from the Mauna Loa Observatory — Bindow"
---

<section class="intro">
<p><mark>The Keeling Curve never sleeps.</mark> This page pulls the latest atmospheric CO₂ readings from NOAA's Mauna Loa Observatory — the longest continuous record of atmospheric carbon dioxide on Earth, running since 1958.</p>
</section>

<article class="home-section">
<h2 class="section-heading">
<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>
Atmospheric CO₂
</h2>

<div id="climate-error" class="astro-error" style="display:none"></div>

<div class="co2-hero">
  <div class="co2-main">
    <span class="co2-value" id="co2-value"><span class="climate-loading">—</span></span>
    <span class="co2-unit" id="co2-unit">ppm CO₂</span>
  </div>
  <p class="co2-meta">
    <span id="co2-date"></span>
    <span class="co2-sep" aria-hidden="true" id="co2-sep" style="display:none">·</span>
    <span id="co2-yoy"></span>
  </p>
  <p class="co2-above" id="co2-above"></p>
</div>
</article>

<article class="home-section">
<h2 class="section-heading">
<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
Last 3 years · monthly
</h2>

<div class="co2-chart-wrap content-card">
  <div class="co2-chart-labels">
    <span id="co2-rate" class="climate-loading"></span>
  </div>
  <div class="co2-chart activity-bars" id="co2-chart" aria-label="CO₂ monthly readings bar chart" style="grid-template-columns: repeat(36, minmax(0, 1fr)); height: 7rem;">
    <span class="climate-loading"></span>
  </div>
  <p class="co2-chart-caption">Mauna Loa, Hawaii · NOAA Global Monitoring Laboratory · height = monthly mean CO₂</p>
</div>
</article>

<article class="home-section">
<h2 class="section-heading">
<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
Milestones
</h2>

<div id="co2-milestones" class="milestone-list climate-loading">
  Loading milestones…
</div>
</article>

<script defer src="/js/climate.js"></script>
