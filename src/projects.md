---
layout: layouts/base.njk
title: Projects
description: "Research and projects by Bindow"
---

<section class="intro">
<p><mark>A collection of my research work and side projects.</mark></p>
</section>

<div class="about-section">
<h2>Research</h2>

<div class="content-card">
<h3>Physics-Informed Neural Networks for PDEs</h3>
<p>Exploring the use of physics-informed neural networks (PINNs) to solve partial differential equations, combining the flexibility of neural networks with the rigor of physical laws.</p>
<section class="heat-experiment" data-heat-experiment aria-label="Interactive heat diffusion experiment" hidden>
<div class="heat-heading">
<span class="heat-eyebrow">HEAT LAB <span aria-hidden="true">/ 01</span></span>
<span class="heat-equation" aria-label="Heat equation: rate of change of temperature equals diffusivity times the Laplacian of temperature">∂u/∂t = α∇²u</span>
</div>
<div class="heat-stage">
<canvas class="heat-canvas" width="112" height="72" tabindex="0" role="img" aria-label="Interactive temperature field" aria-describedby="heat-instructions">Interactive heat diffusion field.</canvas>
<span class="heat-stage-label" aria-hidden="true">u(x, y)</span>
<span class="heat-state"><span class="heat-state-dot" aria-hidden="true"></span><span data-heat-state>Diffusing</span></span>
</div>
<div class="heat-toolbar">
<div class="heat-actions">
<button type="button" class="heat-button" data-heat-toggle aria-pressed="true" aria-label="Pause heat diffusion"><svg class="heat-pause-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 3h3v10H4zm5 0h3v10H9z"/></svg><svg class="heat-play-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="m5 2 9 6-9 6z"/></svg><span data-heat-toggle-label>Pause</span></button>
<button type="button" class="heat-button heat-reset" data-heat-reset aria-label="Reset temperature field"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 6A5.5 5.5 0 1 1 3 11M2.5 2.5V6H6"/></svg><span>Reset</span></button>
</div>
<label class="heat-speed">Diffusion <input type="range" min="0.25" max="2.5" step="0.25" value="1" data-heat-speed aria-label="Diffusion speed"><output data-heat-speed-value>1×</output></label>
</div>
<div class="heat-footer">
<p id="heat-instructions">Draw warmth. Watch it spread. <span>Touch or drag · Keyboard: arrows + Space</span></p>
<div class="heat-legend" aria-label="Temperature scale, cool to warm"><span>Cool</span><span class="heat-legend-bar" aria-hidden="true"></span><span>Warm</span></div>
</div>
<p class="heat-method">2D finite differences · ambient-temperature edges</p>
</section>
</div>

<div class="content-card">
<h3>Operator Learning</h3>
<p>Investigating neural operators for learning mappings between infinite-dimensional function spaces, with applications to scientific computing.</p>
</div>

<div class="content-card">
<h3>Preconditioner Learning</h3>
<p>Research on learning optimal preconditioners for iterative solvers using machine learning techniques.</p>
</div>
</div>

<div class="about-section">
<h2>Side Projects</h2>

<div class="content-card">
<h3>This Website</h3>
<p>A minimal, content-focused personal site built with <a href="https://www.11ty.dev/">11ty</a> and hosted on GitHub Pages.</p>
</div>
</div>

<link rel="stylesheet" href="/css/heat-experiment.css">
<script type="module" src="/js/heat-experiment.js"></script>
