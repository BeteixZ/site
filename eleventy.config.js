import tablerIcons from '@cdransf/eleventy-tabler-icons-filled';

export default async function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPlugin(tablerIcons, {
    className: 'icon',
    errorOnMissing: true
  });

  return {
    dir: {
      input: "src",
      output: "public"
    }
  };
};