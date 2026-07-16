const fs = require('fs');
const path = require('path');
const Hexo = require('hexo');

const hexo = new Hexo(process.cwd(), { silent: true });

hexo.init().then(() => hexo.load()).then(() => {
  const Post = hexo.model('Post');
  const PostAsset = hexo.model('PostAsset');
  
  // Get all posts
  const posts = Post.toArray();
  console.log(`Processing ${posts.length} posts...`);
  
  let fixedCount = 0;
  
  posts.forEach(post => {
    const htmlPath = path.join(hexo.public_dir, post.path, 'index.html');
    
    if (!fs.existsSync(htmlPath)) return;
    
    let html = fs.readFileSync(htmlPath, 'utf8');
    const originalHtml = html;
    
    // Build asset map for this post
    const postDir = path.join('source', path.dirname(post.source), path.basename(post.source, path.extname(post.source)));
    const assets = PostAsset.find({ post: post._id });
    
    const assetMap = {};
    assets.forEach(asset => {
      const filename = path.basename(asset._id);
      assetMap[filename] = '/' + asset.path;
    });
    
    // Fix broken image paths like /.io//xxx.png or /xxx.png (without date prefix)
    html = html.replace(/src="([^"]+)"/g, (match, src) => {
      // Skip if already correct or external
      if (src.startsWith('http') || src.startsWith('//')) return match;
      
      // Check for broken pattern /.io//filename
      const brokenMatch = src.match(/^\/\.io\/\/(.+)$/);
      if (brokenMatch) {
        const filename = brokenMatch[1];
        if (assetMap[filename]) {
          fixedCount++;
          return `src="${assetMap[filename]}"`;
        }
      }
      
      // Check for pattern /filename.png (missing date prefix)
      const simpleMatch = src.match(/^\/([^\/]+\.png|[^\/]+\.jpg|[^\/]+\.webp)$/);
      if (simpleMatch) {
        const filename = simpleMatch[1];
        if (assetMap[filename]) {
          fixedCount++;
          return `src="${assetMap[filename]}"`;
        }
      }
      
      return match;
    });
    
    if (html !== originalHtml) {
      fs.writeFileSync(htmlPath, html);
    }
  });
  
  console.log(`Fixed ${fixedCount} image paths`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
