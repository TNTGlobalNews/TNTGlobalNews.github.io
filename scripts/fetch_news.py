"""Fetch RSS feeds, summarize new items, merge into news.json."""
import json, os, re, html, urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone

MEDIA = '{http://search.yahoo.com/mrss/}'
KEY = os.environ.get('ANTHROPIC_API_KEY', '')
PER_FEED, KEEP = 12, 60

def fetch(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers=headers or {'User-Agent': 'Mozilla/5.0 news-bot'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()

def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()

def summarize(title, text, lang):
    snippet = (text[:220].rsplit(' ', 1)[0] + '…') if len(text) > 220 else text
    if not KEY or not text:
        return snippet  # free mode: short feed snippet, no AI
    language = 'Bangla' if lang == 'bn' else 'English'
    prompt = (f"Write a neutral summary of at most 2 short sentences in {language}. "
              f"Use ONLY facts in the text below and add nothing. Output the summary only.\n\n"
              f"Title: {title}\nText: {text[:1500]}")
    body = json.dumps({'model': 'claude-haiku-4-5-20251001', 'max_tokens': 250,
                       'messages': [{'role': 'user', 'content': prompt}]}).encode()
    try:
        out = json.loads(fetch('https://api.anthropic.com/v1/messages', body,
                               {'content-type': 'application/json', 'x-api-key': KEY,
                                'anthropic-version': '2023-06-01'}))
        return out['content'][0]['text'].strip()
    except Exception as e:
        print('AI summary failed:', e)
        return snippet

def parse(feed):
    root = ET.fromstring(fetch(feed['url']))
    items = []
    for it in root.iter('item'):
        link, title = (it.findtext('link') or '').strip(), clean(it.findtext('title'))
        if not link or not title:
            continue
        img = ''
        for tag in ('thumbnail', 'content'):
            el = it.find(MEDIA + tag)
            if el is not None and el.get('url'):
                img = el.get('url'); break
        try:
            ts = parsedate_to_datetime(it.findtext('pubDate')).astimezone(timezone.utc)
        except Exception:
            ts = datetime.now(timezone.utc)
        items.append({'cat': feed['cat'], 'h': title, 'raw': clean(it.findtext('description')),
                      'src': feed['name'], 'url': link, 'img': img, 'ts': ts.isoformat()})
    return items[:PER_FEED]

def main():
    feeds = json.load(open('feeds.json', encoding='utf-8'))
    try:
        data = json.load(open('news.json', encoding='utf-8'))
    except Exception:
        data = {}
    for lang, flist in feeds.items():
        old = data.get(lang, [])
        known = {a['url'] for a in old}
        for feed in flist:
            try:
                for a in parse(feed):
                    if a['url'] in known:
                        continue
                    a['e'] = summarize(a['h'], a.pop('raw'), lang)
                    old.append(a); known.add(a['url'])
            except Exception as e:
                print('Feed failed:', feed['url'], e)
        old.sort(key=lambda a: a['ts'], reverse=True)
        data[lang] = old[:KEEP]
    json.dump(data, open('news.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
