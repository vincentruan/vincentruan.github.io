const Hexo = require('hexo');
const hexo = new Hexo(process.cwd(), { silent: true });

hexo.init().then(() => hexo.load()).then(() => {
  const url_for = hexo.extend.helper.get('url_for').bind(hexo);
  
  console.log('url_for tests:');
  console.log('  url_for("7f749fc8.png"):', url_for('7f749fc8.png'));
  console.log('  url_for("/7f749fc8.png"):', url_for('/7f749fc8.png'));
  console.log('  url_for("./7f749fc8.png"):', url_for('./7f749fc8.png'));
  console.log('  url_for("2020/02/12/不可不说的Java锁事/7f749fc8.png"):', url_for('2020/02/12/不可不说的Java锁事/7f749fc8.png'));
  
  console.log('\nConfig:');
  console.log('  url:', hexo.config.url);
  console.log('  root:', hexo.config.root);
  console.log('  relative_link:', hexo.config.relative_link);
  
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
