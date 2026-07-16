const Hexo = require('hexo');
const hexo = new Hexo(process.cwd(), { silent: true });

hexo.init().then(() => hexo.load()).then(() => {
  console.log('Config check:');
  console.log('  post_asset_folder:', hexo.config.post_asset_folder);
  console.log('  marked:', JSON.stringify(hexo.config.marked, null, 2));
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
