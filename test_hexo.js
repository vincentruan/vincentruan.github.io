const Hexo = require('hexo');
const path = require('path');

const hexo = new Hexo(process.cwd(), { silent: true });

hexo.init().then(() => {
  return hexo.load();
}).then(() => {
  const Post = hexo.model('Post');
  const PostAsset = hexo.model('PostAsset');
  
  const post = Post.findOne({ source: '_posts/不可不说的Java锁事.md' });
  if (!post) {
    console.log('Post not found');
    process.exit(1);
  }
  
  console.log('Post found:', post.source);
  console.log('Post path:', post.path);
  
  const assets = PostAsset.find({ post: post._id });
  console.log('\nAssets count:', assets.length);
  assets.forEach((asset, i) => {
    if (i < 3) {
      console.log(`  Asset ${i}:`);
      console.log(`    _id: ${asset._id}`);
      console.log(`    path: ${asset.path}`);
    }
  });
  
  const testFile = '7f749fc8.png';
  const postDir = path.join('source', path.dirname(post.source), path.basename(post.source, path.extname(post.source)));
  
  console.log('\npostDir:', postDir);
  
  const testPaths = [
    path.join(postDir, testFile).replace(/\\/g, '/'),
    `source/_posts/不可不说的Java锁事/${testFile}`,
    `_posts/不可不说的Java锁事/${testFile}`,
    `不可不说的Java锁事/${testFile}`,
    `2020/02/12/不可不说的Java锁事/${testFile}`
  ];
  
  testPaths.forEach(p => {
    const asset = PostAsset.findById(p);
    console.log(`findById("${p}"):`, !!asset);
  });
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
