---
layout: layouts/base.njk
title: Music
description: "Recent listening activity and ListenBrainz statistics from Bindow"
---

<section class="intro music-intro" data-listenbrainz-widget data-listenbrainz-user="Beteix" data-listenbrainz-list-limit="12">
<p><mark>Music is the part of my desk that refuses to stay in the background.</mark> This page pulls recent listens and listening summaries from ListenBrainz while the page is open.</p>

<a href="https://listenbrainz.org/user/Beteix/" target="_blank" rel="noopener noreferrer" class="latest-track-card hero-listen" data-lb-current>
<span class="live-dot" aria-hidden="true"></span>
<span class="latest-track-copy">
<span class="eyebrow" data-lb-status>Latest track</span>
<strong data-lb-track>Loading recent listen...</strong>
<span data-lb-artist>ListenBrainz</span>
</span>
<span class="latest-track-time" data-lb-time>refreshing</span>
</a>

<div class="range-tabs" role="tablist" aria-label="Listening summary range">
<button type="button" class="active" data-lb-range="week">Week</button>
<button type="button" data-lb-range="month">Month</button>
<button type="button" data-lb-range="year">Year</button>
</div>

<div class="music-dashboard" data-lb-summary>
<div class="art-frame art-grid" data-lb-art-grid aria-label="Top album covers">
<span></span><span></span><span></span><span></span>
</div>

<div class="summary-panel">
<div class="summary-eyebrow" data-lb-range-label>This week</div>
<div class="summary-metrics">
<div>
<strong data-lb-total>--</strong>
<span>listens</span>
</div>
<div>
<strong data-lb-artists>--</strong>
<span>artists</span>
</div>
<div>
<strong data-lb-albums>--</strong>
<span>albums</span>
</div>
<div>
<strong data-lb-tracks>--</strong>
<span>tracks</span>
</div>
</div>
<div class="activity-bars" data-lb-activity-bars aria-label="Listening activity chart"></div>
</div>
</div>
</section>

<article class="home-section">
<h2 class="section-heading">
<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18h16"></path><path d="M7 14v4"></path><path d="M12 10v8"></path><path d="M17 6v12"></path></svg>
Top this range
</h2>

<div class="music-stat-columns">
<section>
<h3>Artists</h3>
<ol class="rank-list" data-lb-top-artists>
<li>Loading...</li>
</ol>
</section>
<section>
<h3>Albums</h3>
<ol class="rank-list" data-lb-top-albums>
<li>Loading...</li>
</ol>
</section>
<section>
<h3>Tracks</h3>
<ol class="rank-list" data-lb-top-tracks>
<li>Loading...</li>
</ol>
</section>
</div>
</article>

<article class="home-section">
<h2 class="section-heading">
<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
Recent listens
</h2>

<div class="listen-list" data-lb-list aria-live="polite">
<article class="listen-row is-loading">
<div class="listen-art"></div>
<div>
<h3>Loading listening history...</h3>
<p>Fetching from ListenBrainz</p>
</div>
</article>
</div>
</article>
