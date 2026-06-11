<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  
  let container: HTMLElement;
  
  onMount(() => {
    // Initialize visualizations here
    console.log('GNN Article initialized');
    
    return () => {
      // Cleanup
    };
  });
</script>

<article class="gnn-article">
  <h1>An Introduction to Graph Neural Networks</h1>
  
  <div bind:this={container} class="visualization-container">
    <!-- Visualizations will be rendered here -->
  </div>
  
  <div class="content">
    <p>Neural networks have been adapted to leverage the structure and properties of graphs. We explore the components needed for building a graph neural network - and motivate the design choices behind them.</p>
  </div>
</article>

<style>
  .gnn-article {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  .visualization-container {
    margin: 2rem 0;
    min-height: 400px;
  }
  
  .content {
    line-height: 1.6;
  }
</style>