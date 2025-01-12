import tablerIcons from '@cdransf/eleventy-tabler-icons-filled';
import fetch from 'node-fetch';
import { createCanvas, loadImage } from 'canvas';

export default async function(eleventyConfig) {
  // Existing config
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPlugin(tablerIcons, {
    className: 'icon',
    errorOnMissing: true
  });

  // 定义过滤器
  eleventyConfig.addFilter("mark", function(content) {
    return content.replace(/==(.*?)==/g, "<mark>$1</mark>");
  });

  eleventyConfig.addPassthroughCopy("src/assets");

  // Function to quantize a color value to reduce color space
  const quantizeColor = (r, g, b) => {
    // Reduce to 4 bits per channel (4096 total colors)
    const qr = Math.floor(r / 16) * 16;
    const qg = Math.floor(g / 16) * 16;
    const qb = Math.floor(b / 16) * 16;
    return `${qr},${qg},${qb}`;
  };

  // Add Last.fm badge shortcode
  eleventyConfig.addAsyncShortcode("lastfmBadge", async function() {
    try {
      const response = await fetch('https://lastfm-last-played.biancarosa.com.br/Beteix/latest-song');
      const data = await response.json();
      
      const albumArtUrl = data.track.image.find(img => img.size === 'small')['#text'];
      
      const img = await loadImage(albumArtUrl);
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      // Count color frequencies
      const colorFreq = new Map();
      
      // Sample pixels (every 4th pixel to improve performance)
      for (let i = 0; i < pixels.length; i += 16) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        // Skip very dark and very light colors
        if ((r + g + b) / 3 < 20 || (r + g + b) / 3 > 235) continue;
        
        const quantizedColor = quantizeColor(r, g, b);
        colorFreq.set(quantizedColor, (colorFreq.get(quantizedColor) || 0) + 1);
      }
      
      // Find the most frequent color
      let maxFreq = 0;
      let dominantColor = '0,0,0';
      
      for (const [color, freq] of colorFreq.entries()) {
        if (freq > maxFreq) {
          maxFreq = freq;
          dominantColor = color;
        }
      }
      
      // Convert back to hex
      const [r, g, b] = dominantColor.split(',').map(Number);
      const color = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      
      return `https://img.shields.io/endpoint?color=${color}&style=for-the-badge&url=https://lastfm-last-played.biancarosa.com.br/Beteix/latest-song?format=shields.io`;
    } catch (error) {
      console.error('Error:', error);
      return 'https://img.shields.io/endpoint?color=blueviolet&style=for-the-badge&url=https://lastfm-last-played.biancarosa.com.br/Beteix/latest-song?format=shields.io';
    }
  });

  // Existing return configuration
  return {
    dir: {
      input: "src",
      output: "public"
    },
    pathPrefix: "/site/"
  };
}