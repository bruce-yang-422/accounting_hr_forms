"""Build deterministic PWA icons and a content-versioned service worker.

Run after changing pages, assets, the manifest, or the service worker template.
Requires Pillow, already included in requirements.txt.
"""
from hashlib import sha256
from pathlib import Path
import json

from PIL import Image
from build_icons import build as build_icons

ROOT = Path(__file__).resolve().parents[1]


def build():
    build_icons()
    icons = ROOT / 'assets/images/pwa'
    icons.mkdir(parents=True, exist_ok=True)
    # Export the existing brand icon at platform-required sizes; no redesign.
    with Image.open(ROOT / 'assets/images/branding/form-center.ico') as source:
        logo = source.convert('RGBA')
        for name, size in [('icon-192.png', 192), ('icon-512.png', 512), ('apple-touch-icon.png', 180)]:
            image = Image.new('RGBA', (size, size), '#fdf5ef')
            image.alpha_composite(logo.resize((size, size), Image.Resampling.LANCZOS))
            image.convert('RGB').save(icons / name, optimize=True)

    paths = ['index.html', 'guide.html', 'favorites.html', 'forms/payment_request_form.html',
             'forms/leave_request_form.html', 'forms/overtime_request_form.html', 'forms/travel_request_form.html', 'forms/purchase_request_form.html', 'forms/receipt_form.html', 'forms/simple_receipt_form.html',
             'offline.html', 'manifest.webmanifest']
    paths += [path.relative_to(ROOT).as_posix() for folder in ['assets/js', 'assets/css', 'assets/images/pwa', 'assets/icons']
              for path in sorted((ROOT / folder).rglob('*')) if path.is_file()]
    paths += ['assets/images/branding/form-center-hero-banner-desktop.png',
              'assets/images/branding/form-center-hero-banner-mobile.png']
    paths = sorted(set(paths))
    template = (ROOT / 'scripts/service-worker.template.js').read_text(encoding='utf-8')
    digest = sha256(template.encode())
    for path in paths:
        digest.update(path.encode())
        digest.update(b'\0')
        digest.update((ROOT / path).read_bytes())
    version = digest.hexdigest()[:16]
    output = template.replace('__PWA_VERSION__', json.dumps(version)).replace('__PWA_PRECACHE__', json.dumps(paths, indent=2, ensure_ascii=False))
    with (ROOT / 'service-worker.js').open('w', encoding='utf-8', newline='\n') as target:
        target.write(output)
    print(f'PWA version {version}: {len(paths)} offline resources')


if __name__ == '__main__':
    build()
