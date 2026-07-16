/* global hexo */
'use strict';

const path = require('path');

// Fix broken asset image paths caused by hexo-renderer-marked bug
hexo.extend.filter.register('after_render:html', function(str, data) {
  if (!data || !data.path) return str;
  
  const Post = this.model('Post');
  const PostAsset = this.model('PostAsset');
  
  // Normalize path - remove index.html suffix
  const postPath = data.path.replace(/\\/g, '/').replace(/\/?index\.html$/, '');
  const posts = Post.toArray();
  const post = posts.find(p => p.path.replace(/\/$/, '') === postPath);
  
  if (!post) return str;
  
  // Get all assets for this post
  const assets = PostAsset.find({ post: post._id });
  const assetMap = {};
  assets.forEach(asset => {
    const filename = path.basename(asset._id);
    assetMap[filename] = '/' + asset.path;
  });
  
  // Fix broken image paths
  return str.replace(/<img([^>]*)src="([^"]+)"([^>]*)>/g, (match, before, src, after) => {
    // Skip external URLs
    if (src.startsWith('http') || src.startsWith('//')) return match;
    
    // Fix broken pattern /.io//filename
    const brokenMatch = src.match(/^\/\.io\/\/(.+)$/);
    if (brokenMatch) {
      const filename = brokenMatch[1];
      if (assetMap[filename]) {
        return `<img${before}src="${assetMap[filename]}"${after}>`;
      }
    }
    
    return match;
  });
}, 10);
