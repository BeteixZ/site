import tablerIcons from '@cdransf/eleventy-tabler-icons-filled';

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

  // Simplified Last.fm badge shortcode without node-fetch dependency
  eleventyConfig.addShortcode("lastfmBadge", function() {
    // Return a static shield.io badge that will be updated by client-side JavaScript
    return `https://img.shields.io/endpoint?color=blueviolet&style=for-the-badge&url=https://lastfm-last-played.biancarosa.com.br/Beteix/latest-song?format=shields.io`;
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