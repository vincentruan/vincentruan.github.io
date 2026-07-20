/* global hexo */
'use strict';

// NexT's mermaid tag plugin emits the `<pre><code class="mermaid">` structure
// that its front-end script (`pre > .mermaid` selector) renders into a diagram.
// But the tag is only triggered by the `{% mermaid %}...{% endmermaid %}` syntax,
// NOT by a fenced ```mermaid code block — Hexo's highlighter intercepts the
// fence and turns it into `<figure class="highlight plaintext">`, so the
// diagram never renders.
//
// Convert fenced ```mermaid blocks into the NexT `{% mermaid %}` block tag so
// they go through the official tag path. Registered with priority 9 so it runs
// BEFORE Hexo's built-in `backtick_code_block` filter (priority 10), which
// would otherwise swallow the fence into a <hexoPostRenderCodeBlock>
// placeholder before we can see it — and `backtick_code_block` renders mermaid
// as a plain highlighted code block instead of the `<code class="mermaid">`
// structure NexT's front-end expects.
hexo.extend.filter.register('before_post_render', function (data) {
  if (!data || typeof data.content !== 'string') return data;
  // Match a ```mermaid fence (with optional trailing whitespace) through its
  // closing ```. The `s` flag lets `.` span newlines so multi-line diagrams
  // are captured whole.
  data.content = data.content.replace(/```mermaid[^\n]*\n([\s\S]*?)```/g, function (_, body) {
    return '{% mermaid %}\n' + body.replace(/\n$/, '') + '\n{% endmermaid %}';
  });
  return data;
}, 9);
