/**
 * TTS Audio Player — HTML5 audio with Media Session API
 * Loaded via NexT bodyEnd injection. No-ops when no player element exists.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('tts-audio-player');
    if (!container) return;

    var src = container.getAttribute('data-audio-src');
    if (!src) return;

    var audio = new Audio(src);
    audio.preload = 'metadata';

    // --- DOM refs ---
    var playBtn = container.querySelector('.tts-play-btn');
    var bar = container.querySelector('.tts-player-bar');
    var timeDisplay = container.querySelector('.tts-player-time');
    var speedBtn = container.querySelector('.tts-player-speed');

    var speeds = [1, 1.25, 1.5, 1.75, 2, 0.75];
    var speedIdx = 0;

    // --- Helpers ---
    function fmt(sec) {
      if (!sec || !isFinite(sec)) return '0:00';
      var m = Math.floor(sec / 60);
      var s = Math.floor(sec % 60);
      return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function hidePlayer() {
      container.style.display = 'none';
    }

    // --- Events ---
    playBtn.addEventListener('click', function () {
      if (audio.paused) {
        audio.play().catch(function (err) {
          console.warn('[TTS] Playback failed:', err.message);
          hidePlayer();
        });
      } else {
        audio.pause();
      }
    });

    audio.addEventListener('play', function () { playBtn.textContent = '⏸'; });
    audio.addEventListener('pause', function () { playBtn.textContent = '▶'; });

    audio.addEventListener('loadedmetadata', function () {
      timeDisplay.textContent = '0:00 / ' + fmt(audio.duration);
      bar.max = audio.duration || 100;
    });

    audio.addEventListener('timeupdate', function () {
      bar.value = audio.currentTime || 0;
      timeDisplay.textContent = fmt(audio.currentTime) + ' / ' + fmt(audio.duration);
    });

    audio.addEventListener('ended', function () {
      playBtn.textContent = '▶';
      bar.value = 0;
      timeDisplay.textContent = '0:00 / ' + fmt(audio.duration);
    });

    audio.addEventListener('error', function () {
      hidePlayer();
    });

    bar.addEventListener('input', function () {
      if (audio.duration) {
        audio.currentTime = parseFloat(bar.value);
      }
    });

    speedBtn.addEventListener('click', function () {
      speedIdx = (speedIdx + 1) % speeds.length;
      audio.playbackRate = speeds[speedIdx];
      speedBtn.textContent = speeds[speedIdx] + 'x';
    });

    // --- Media Session API (lock screen / car Bluetooth) ---
    if ('mediaSession' in navigator) {
      var postTitle = '';
      var titleEl = document.querySelector('.post-title');
      if (titleEl) {
        postTitle = titleEl.textContent.trim();
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: postTitle || document.title,
        artist: '星辰大海',
        album: 'TTS 语音朗读'
      });

      navigator.mediaSession.setActionHandler('play', function () { audio.play(); });
      navigator.mediaSession.setActionHandler('pause', function () { audio.pause(); });
      // No playlist concept — disable prev/next
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    }
  });
})();
