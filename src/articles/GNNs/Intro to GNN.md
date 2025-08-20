---
title: "An Introduction to Graph Neural Networks"
layout: layouts/distill.njk
permalink: "/articles/GNNs/Intro2GNN/"

---

# An Introduction to Graph Neural Networks

Neural networks have been adapted to leverage the structure and properties of graphs. We explore the components needed for building a graph neural network - and motivate the design choices behind them.

  <figure class=teaser>
    <div id=layerwise-trace> </div>
    <figcaption>
Hover over a node in the diagram below to see how it accumulates information from nodes around it through the layers of the network.
    </figcaption>
</figure>

<h3 id="text-as-graphs">Text as graphs</h3>
<p>We can digitize text by associating indices to each character, word, or token, and representing text as a sequence of these indices. This creates a simple directed graph, where each character or index is a node and is connected via an edge to the node that follows it.</p>
<figure>
<div id='text-as-graph'></div>
<figcaption>
Edit the text above to see how the graph representation changes.
</figcaption>
</figure>
