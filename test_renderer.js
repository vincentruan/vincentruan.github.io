const Hexo = require('hexo');
const path = require('path');
const hexo = new Hexo(process.cwd(), { silent: true });

hexo.init().then(() => hexo.load()).then(() => {
  const Post = hexo.model('Post');
  const post = Post.findOne({ source: '_posts/不可不说的Java锁事.md' });
  
  if (!post) {
    console.log('Post not found');
    process.exit(1);
  }
  
  // Simulate what hexo-renderer-marked does
  const source_dir = hexo.source_dir;
  const post_asset_folder = hexo.config.post_asset_folder;
  const markedCfg = hexo.config.marked;
  
  console.log('post_asset_folder:', post_asset_folder);
  console.log('marked.prependRoot:', markedCfg.prependRoot);
  console.log('marked.postAsset:', markedCfg.postAsset);
  
  // Calculate postPath like hexo-renderer-marked does
  const data_path = source_dir + '_posts/不可不说的Java锁事.md';
  const source = data_path.substring(source_dir.length).replace(/\\/g, '/');
  console.log('\nsource:', source);
  
  const foundPost = Post.findOne({ source });
  console.log('Post found:', !!foundPost);
  
  if (foundPost) {
    const postSource = foundPost.source;
    const dirname = path.dirname;
    const basename = path.basename;
    const extname = path.extname;
    const join = path.join;
    
    const postPath = join(source_dir, dirname(postSource), basename(postSource, extname(postSource)));
    console.log('postPath:', postPath);
    
    // Test asset lookup
    const PostAsset = hexo.model('PostAsset');
    const href = '7f749fc8.png';
    const assetLookupPath = join(postPath, href.replace(/\\/g, '/'));
    console.log('assetLookupPath:', assetLookupPath);
    
    const asset = PostAsset.findById(assetLookupPath);
    console.log('Asset found:', !!asset);
    if (asset) {
      console.log('Asset path:', asset.path);
      
      // Test url_for
      const url_for = hexo.extend.helper.get('url_for').bind(hexo);
      console.log('url_for(asset.path):', url_for(asset.path));
    }
  }
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
