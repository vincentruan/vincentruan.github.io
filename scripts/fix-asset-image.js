/* global hexo */
'use strict';

const path = require('path');

console.log('[fix-asset] Registering after_render filter');

hexo.extend.filter.register('after_render', function(str, data) {
  console.log('[fix-asset] after_render triggered for:', data.path);
  return str;
});
