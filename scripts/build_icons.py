"""Inline the original SVG symbol library so icons also work from local files."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PAGES = ['index.html', 'guide.html', 'favorites.html', 'offline.html', '404.html',
         'forms/payment_request_form.html', 'forms/leave_request_form.html']


def build():
    source = (ROOT / 'assets/icons/ui.svg').read_text(encoding='utf-8').strip()
    sprite = source.replace('<svg xmlns="http://www.w3.org/2000/svg">',
                            '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" '
                            'focusable="false" width="0" height="0" '
                            'style="position:absolute;overflow:hidden">', 1)
    block = '<!-- SVG ICONS:START -->\n' + sprite + '\n<!-- SVG ICONS:END -->'
    for filename in PAGES:
        path = ROOT / filename
        html = path.read_text(encoding='utf-8')
        if '<!-- SVG ICONS:START -->' in html:
            html = re.sub(r'<!-- SVG ICONS:START -->.*?<!-- SVG ICONS:END -->', lambda _: block, html, flags=re.S)
        else:
            html = re.sub(r'(<body[^>]*>)', lambda match: match[0] + '\n' + block, html, count=1)
        with path.open('w', encoding='utf-8', newline='\n') as target:
            target.write(html)


if __name__ == '__main__':
    build()
