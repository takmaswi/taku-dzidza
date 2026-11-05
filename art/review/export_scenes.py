"""Export reviewed imagegen compositions at requested sizes; record native provenance."""
import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ART = Path(__file__).resolve().parents[1]
OUT = ART / 'assets/scenes'
OUT.mkdir(parents=True, exist_ok=True)
FONT = ART / 'brand/takudzidza/source/Inter-Variable.ttf'
records = []
for entry in json.loads((ART / 'review/scene-sources.json').read_text()):
    source = Path(entry['source'])
    native = Image.open(source).convert('RGB')
    size = tuple(entry['size'])
    image = ImageOps.fit(native, size, Image.Resampling.LANCZOS)
    image.save(OUT / (entry['name'] + '.png'), optimize=True)
    limit = 250_000
    for quality in range(95, -1, -1):
        buffer = io.BytesIO()
        image.save(buffer, 'WEBP', quality=quality, method=6)
        if buffer.tell() < limit:
            (OUT / (entry['name'] + '.webp')).write_bytes(buffer.getvalue())
            break
    else:
        raise ValueError('Scene cannot meet WebP budget')
    records.append({**entry, 'source_native_size': list(native.size),
                    'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                    'export_size': list(size), 'scale_to_export': max(size[0]/native.width, size[1]/native.height),
                    'generator': 'Built-in imagegen, reference compositing; tool model identifier unavailable',
                    'exporter': 'Pillow Lanczos centred aspect fit, no retouching',
                    'background_removal': 'Not applicable: opaque finished composition; reference person was generated alpha cutout',
                    'webp_quality': quality, 'webp_limit_bytes': limit})
(OUT / 'manifest.json').write_text(json.dumps(records, indent=2) + '\n')
font = ImageFont.truetype(str(FONT), 26)
font.set_variation_by_axes([14, 600])
board = Image.new('RGB', (1600, 1660), '#FFF8F0')
draw = ImageDraw.Draw(board)
for i, record in enumerate(records):
    draw.text((40, 20+i*545), record['name'] + ' / ' + ' x '.join(map(str,record['size'])), fill='#4A3010', font=font)
    preview = Image.open(OUT / (record['name']+'.webp'))
    preview.thumbnail((1520, 465), Image.Resampling.LANCZOS)
    board.paste(preview, (40, 70+i*545))
board.save(OUT / 'board.png', optimize=True)
print([(r['name'], r['source_native_size'], r['export_size'], r['webp_quality']) for r in records])
