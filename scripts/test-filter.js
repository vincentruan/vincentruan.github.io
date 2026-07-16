/* global hexo */
'use strict';

console.log('[test-filter] Script loaded');

hexo.extend.filter.register('after_post_render', function(data) {
  console.log('[test-filter] after_post_render triggered for:', data.source);
  return data;
}, 0);
