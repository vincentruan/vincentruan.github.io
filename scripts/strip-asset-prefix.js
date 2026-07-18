/* global hexo */
'use strict';

const path = require('path');

// Source markdown references post assets as <PostName>/<image> so the .md
// renders correctly on GitHub/preview. The renderer's postAsset pipeline
// expects the bare <image> form, so strip the per-post folder prefix here.
hexo.extend.filter.register('before_post_render', function (data) {
  if (!data || !data.source) return data;
  const postDir = path.basename(data.source, path.extname(data.source));
  const prefix = postDir + '/';
  data.content = data.content.replace(/(!\[[^\]]*\]\()([^)]+)(\))/g, function (match, head, target, tail) {
    if (target.startsWith(prefix)) {
      return head + target.slice(prefix.length) + tail;
    }
    return match;
  });
  return data;
});
