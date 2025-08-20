// eleventy.config.mjs
import tablerIcons from '@cdransf/eleventy-tabler-icons-filled';
import fs from 'fs';
import path from 'path';

export default async function(eleventyConfig) {
  const pathPrefix = process.env.NODE_ENV === 'production' ? '/site' : '';

  eleventyConfig.addPassthroughCopy({ 'src/assets/js': `${pathPrefix}/assets/js` });
  eleventyConfig.addPassthroughCopy({ 'src/assets/css': `${pathPrefix}/assets/css` });
  eleventyConfig.addPassthroughCopy({ 'src/assets/images': `${pathPrefix}/assets/images` });
  eleventyConfig.addPassthroughCopy({ 'src/css': `${pathPrefix}/css` });
  eleventyConfig.addPassthroughCopy({ 'src/js': `${pathPrefix}/js` });
  eleventyConfig.addPassthroughCopy({ 
    'src/assets/distill/public/': `${pathPrefix}/public/articles/GNNs/Intro2GNN` 
  });
  // 插件
  eleventyConfig.addPlugin(tablerIcons, {
    className: 'icon',
    errorOnMissing: true
  });

  // 过滤器：==高亮==
  eleventyConfig.addFilter('mark', (content) =>
    content.replace(/==(.*?)==/g, '<mark>$1</mark>')
  );

  // Last.fm 徽章
  eleventyConfig.addShortcode('lastfmBadge', () =>
    `<img alt="Last.fm" src="https://img.shields.io/endpoint?color=blueviolet&style=for-the-badge&url=https://lastfm-last-played.biancarosa.com.br/Beteix/latest-song?format=shields.io">`
  );

  eleventyConfig.addFilter('distillFiles', (ext) => {
    const dir   = path.join(process.cwd(), 'src', 'assets', ext === 'js' ? 'js' : 'css');
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .map(f => `/assets/${ext === 'js' ? 'js' : 'css'}/${f}`);
  });

  console.log('[11ty] filters registered:', eleventyConfig.filters);

  return {
    dir: {
      input: 'src',
      output: 'public'
    },
    pathPrefix: pathPrefix
  };
}

