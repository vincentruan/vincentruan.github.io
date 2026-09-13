'use strict';

/**
 * Hexo after_render:html filter
 * Replaces the TTS player marker div (rendered by post-body-end.njk)
 * with the full audio player HTML including the correct MP3 path.
 *
 * The marker contains data-page-path which gives us the post's URL path
 * (e.g. "2025/07/14/my-post/"), from which we derive the audio URL.
 */
hexo.extend.filter.register('after_render:html', function (str, data) {
  if (!data || !data.path) return str;

  // Only process if the TTS marker is present
  if (!str.includes('id="tts-audio-player"')) return str;

  const pagePath = data.path; // e.g. "2025/07/14/my-post/index.html"

  // Build audio path: strip index.html and trailing slash, then append .mp3
  // "2025/07/14/my-post/index.html" → "/audio/2025/07/14/my-post.mp3"
  const audioSrc = '/audio/' + pagePath.replace(/\/?index\.html$/, '').replace(/\/$/, '') + '.mp3';

  const playerHTML = '<div id="tts-audio-player" class="tts-audio-player" data-audio-src="' + audioSrc + '">'
    + '<span class="tts-player-icon" title="语音朗读">🔊</span>'
    + '<button class="tts-player-btn tts-play-btn" aria-label="播放/暂停">▶</button>'
    + '<div class="tts-player-progress">'
    + '<input type="range" class="tts-player-bar" value="0" max="100" step="0.1" aria-label="播放进度">'
    + '<span class="tts-player-time">0:00 / 0:00</span>'
    + '</div>'
    + '<button class="tts-player-speed" data-speed="1">1x</button>'
    + '</div>';

  // Replace the marker div with the full player HTML
  return str.replace(/<div id="tts-audio-player"[^>]*><\/div>/, playerHTML);
});
