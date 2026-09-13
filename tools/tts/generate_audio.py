#!/usr/bin/env python3
"""
TTS Audio Generator for Hexo Blog

Reads Hexo db.json, finds posts with tts:true, extracts content from
rendered HTML in public/, adapts non-text elements via Claude API,
and generates MP3 audio using Edge-TTS.

Usage:
    python scripts/tts/generate_audio.py [--no-cache]

Environment:
    ANTHROPIC_API_KEY - required for content adaptation
"""

import os
import sys
import json
import hashlib
import asyncio
import re
from pathlib import Path
from datetime import datetime, timezone, timedelta

# ---------------------------------------------------------------------------
# Dependency checks
# ---------------------------------------------------------------------------

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Error: beautifulsoup4 is required. Run: pip install beautifulsoup4")
    sys.exit(1)

try:
    import edge_tts
except ImportError:
    print("Error: edge-tts is required. Run: pip install edge-tts")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PUBLIC_DIR = REPO_ROOT / "public"
DB_PATH = REPO_ROOT / "db.json"
CACHE_FILE = REPO_ROOT / ".tts-cache.json"
CONFIG_PATH = REPO_ROOT / "_config.next.yml"


# ---------------------------------------------------------------------------
# Hexo database helpers
# ---------------------------------------------------------------------------

def load_db():
    """Load Hexo database and return posts with tts:true."""
    if not DB_PATH.exists():
        print("Error: db.json not found. Run 'npx hexo generate' first.")
        sys.exit(1)
    with open(DB_PATH, "r", encoding="utf-8") as f:
        db = json.load(f)
    posts = [
        p for p in db.get("models", {}).get("Post", [])
        if p.get("tts") is True
    ]
    print(f"Found {len(posts)} posts with tts:true")
    return posts


def read_tts_config():
    """Read TTS config from _config.next.yml (simple YAML parsing)."""
    config = {"enabled": True, "voice": "zh-CN-YunjianNeural", "rate": "+0%", "model": "claude-haiku-4-5-20251001"}
    if not CONFIG_PATH.exists():
        return config
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        content = f.read()
    for key in config:
        m = re.search(rf"^\s+{key}:\s*(.+)$", content, re.MULTILINE)
        if m:
            val = m.group(1).strip()
            # Strip inline YAML comments (space + #) before stripping quotes
            val = re.sub(r'\s+#.*$', '', val).strip()
            val = val.strip('"').strip("'")
            if isinstance(config[key], bool):
                config[key] = val.lower() in ("true", "yes")
            else:
                config[key] = val
    return config


# ---------------------------------------------------------------------------
# Content extraction from rendered HTML
# ---------------------------------------------------------------------------

def extract_content(html_path):
    """Extract structured content from a rendered post HTML file."""
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()
    soup = BeautifulSoup(html, "html.parser")
    article = soup.find("article") or soup.find("div", class_="post-body")
    if not article:
        return None
    content = []

    # --- code blocks (skip mermaid — handled separately) ---
    for pre in article.find_all("pre"):
        if pre.find("code", class_=lambda c: c and "mermaid" in c):
            continue
        code_el = pre.find("code")
        lang = "unknown"
        if code_el:
            cls = code_el.get("class", [])
            for c in cls:
                if c.startswith("hljs-") or c.startswith("language-"):
                    lang = c.replace("hljs-", "").replace("language-", "")
                    break
        code_text = code_el.get_text() if code_el else pre.get_text()
        content.append({"type": "code", "lang": lang, "text": code_text})

    # --- tables ---
    for table in article.find_all("table"):
        headers = [th.get_text(strip=True) for th in table.find_all("th")]
        rows = []
        for tr in table.find_all("tr"):
            cells = [td.get_text(strip=True) for td in tr.find_all("td")]
            if cells:
                rows.append(cells)
        content.append({"type": "table", "headers": headers, "rows": rows})

    # --- mermaid diagrams ---
    for code in article.find_all("code", class_=lambda c: c and "mermaid" in c):
        content.append({"type": "mermaid", "text": code.get_text()})

    # --- images with alt text ---
    for img in article.find_all("img"):
        alt = img.get("alt", "").strip()
        if alt:
            content.append({"type": "image", "alt": alt})

    # --- headings and paragraphs (skip nested content) ---
    for el in article.find_all(["h1", "h2", "h3", "h4", "p", "li"]):
        if el.find_parent("pre") or el.find_parent("table") or el.find_parent("figure"):
            continue
        if el.find("img"):
            continue
        text = el.get_text(strip=True)
        if not text:
            continue
        if el.name in ("h1", "h2", "h3", "h4"):
            content.append({"type": "heading", "level": int(el.name[1]), "text": text})
        elif el.name == "li":
            content.append({"type": "list_item", "text": text})
        else:
            content.append({"type": "paragraph", "text": text})

    return content if content else None


# ---------------------------------------------------------------------------
# Claude content adaptation
# ---------------------------------------------------------------------------

async def adapt_content(content, api_key, model="claude-haiku-4-5-20251001"):
    """Send non-text elements to Claude for spoken-Chinese adaptation."""
    try:
        from anthropic import AsyncAnthropic
    except ImportError:
        print("Warning: anthropic SDK not installed, skipping content adaptation")
        return content

    # Build prompt listing non-text elements
    user_parts = []
    needs_adapt = []
    for i, item in enumerate(content):
        if item["type"] == "code":
            idx = len(needs_adapt)
            needs_adapt.append(i)
            user_parts.append(f"--- 代码块 [{idx}] ({item['lang']}) ---\n{item['text'][:3000]}")
        elif item["type"] == "table":
            idx = len(needs_adapt)
            needs_adapt.append(i)
            hdr = " | ".join(item["headers"]) if item["headers"] else "(no headers)"
            rows_str = "\n".join(" | ".join(r) for r in item["rows"][:20])
            user_parts.append(f"--- 表格 [{idx}] ---\nHeaders: {hdr}\n{rows_str}")
        elif item["type"] == "mermaid":
            idx = len(needs_adapt)
            needs_adapt.append(i)
            user_parts.append(f"--- Mermaid 图 [{idx}] ---\n{item['text'][:2000]}")

    if not needs_adapt:
        return content

    user_text = "\n\n".join(user_parts)
    client = AsyncAnthropic()
    try:
        resp = await client.messages.create(
            model=model,
            max_tokens=4096,
            system="你是技术播客主持人。将代码、表格、图转化为自然流畅的中文口语描述。"
            "要求：1) 描述功能和设计思路，不逐字符读代码；"
            "2) 对表格总结关键对比维度与结论；"
            "3) 对 Mermaid 图逐步 verbal walkthrough；"
            "4) 每个元素输出一段，不加编号前缀；"
            "5) 语言自然流畅，适合听觉消费。",
            messages=[{"role": "user", "content": user_text}],
        )
        result_text = resp.content[0].text
    except Exception as e:
        print(f"Warning: Claude API call failed: {e}")
        return content

    # Parse response — one adaptation paragraph per non-text element
    adapted_lines = []
    for line in result_text.strip().split("\n"):
        cleaned = re.sub(r"^\d+[\.\)、:：]\s*", "", line.strip())
        if cleaned:
            adapted_lines.append(cleaned)

    for i, idx in enumerate(needs_adapt):
        if i < len(adapted_lines):
            content[idx]["adapted"] = adapted_lines[i]

    return content


# ---------------------------------------------------------------------------
# Text assembly
# ---------------------------------------------------------------------------

def content_to_text(content):
    """Convert structured content to flat text for TTS."""
    parts = []
    for item in content:
        t = item["type"]
        if t == "heading":
            parts.append(item["text"])
        elif t in ("paragraph", "list_item"):
            parts.append(item["text"])
        elif t == "code":
            parts.append(item.get("adapted", f"以下是一段{item.get('lang', '')}代码。"))
        elif t == "table":
            parts.append(item.get("adapted", "以下是一个数据表格。"))
        elif t == "mermaid":
            parts.append(item.get("adapted", "以下是一个流程图。"))
        elif t == "image":
            parts.append(item["alt"])
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Audio generation (Edge-TTS)
# ---------------------------------------------------------------------------

async def generate_audio(post, api_key, tts_config, cache, no_cache=False):
    """Generate MP3 for a single post."""
    # Resolve paths
    source_path = post.get("source", "")
    if not source_path.startswith("_posts/"):
        print(f"  Warning: unexpected source path '{source_path}', skipping")
        return False
    rel = source_path[len("_posts/"):]
    name = Path(rel).stem
    date_raw = post.get("date", "")
    try:
        # db.json stores dates as ISO 8601 UTC (e.g. "2025-07-13T16:00:00.000Z")
        # Hexo uses Asia/Shanghai (UTC+8) for permalinks
        utc_dt = datetime.fromisoformat(date_raw.replace("Z", "+00:00"))
        shanghai = timezone(timedelta(hours=8))
        dt = utc_dt.astimezone(shanghai)
    except (ValueError, TypeError, AttributeError):
        # Fallback: try plain YYYY-MM-DD format
        try:
            dt = datetime.strptime(date_raw[:10], "%Y-%m-%d")
        except (ValueError, TypeError):
            print(f"  Warning: invalid date '{date_raw}' for {name}, skipping")
            return False

    audio_rel = os.path.join(str(dt.year), f"{dt.month:02d}", f"{dt.day:02d}", f"{name}.mp3")
    audio_path = PUBLIC_DIR / "audio" / audio_rel
    html_path = PUBLIC_DIR / str(dt.year) / f"{dt.month:02d}" / f"{dt.day:02d}" / name / "index.html"

    if not html_path.exists():
        print(f"  Warning: HTML not found at {html_path}, skipping")
        return False

    # Content-hash cache
    with open(html_path, "rb") as f:
        content_hash = hashlib.md5(f.read()).hexdigest()

    if not no_cache and str(audio_path) in cache and cache[str(audio_path)] == content_hash:
        if audio_path.exists():
            print(f"  Cached: {name}")
            return True

    # Extract content
    content = extract_content(html_path)
    if not content:
        print(f"  Warning: no content extracted for {name}")
        return False

    # Claude adaptation (skip gracefully without API key)
    if api_key:
        content = await adapt_content(content, api_key, tts_config.get("model", "claude-haiku-4-5-20251001"))

    text = content_to_text(content)
    if not text.strip():
        print(f"  Warning: empty text for {name}")
        return False

    # Edge-TTS synthesis
    voice = tts_config.get("voice", "zh-CN-YunjianNeural")
    rate = tts_config.get("rate", "+0%")

    try:
        audio_path.parent.mkdir(parents=True, exist_ok=True)
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        await communicate.save(str(audio_path))
        cache[str(audio_path)] = content_hash
        print(f"  Generated: {audio_rel}")
        return True
    except Exception as e:
        print(f"  Error generating TTS for {name}: {e}")
        if audio_path.exists():
            audio_path.unlink()
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main():
    no_cache = "--no-cache" in sys.argv

    posts = load_db()
    if not posts:
        print("No posts with tts:true. Nothing to do.")
        return

    tts_config = read_tts_config()
    if not tts_config.get("enabled", True):
        print("TTS is disabled in config. Skipping.")
        return

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Warning: ANTHROPIC_API_KEY not set. Content adaptation will be skipped (text-only TTS).")

    # Load cache
    cache = {}
    if CACHE_FILE.exists() and not no_cache:
        with open(CACHE_FILE, "r") as f:
            cache = json.load(f)

    generated = failed = 0
    for post in posts:
        title = post.get("title", "Unknown")
        print(f"\nProcessing: {title}")
        try:
            ok = await generate_audio(post, api_key, tts_config, cache, no_cache)
            if ok:
                generated += 1
            else:
                failed += 1
        except Exception as e:
            print(f"  Unexpected error: {e}")
            failed += 1

    # Persist cache
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)

    print(f"\n=== Summary ===")
    print(f"Total: {len(posts)}, Generated: {generated}, Failed: {failed}")


if __name__ == "__main__":
    asyncio.run(main())
