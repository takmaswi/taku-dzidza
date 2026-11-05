"""Build Inter-labelled review boards from exported images without changing subjects."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ART = Path(__file__).resolve().parents[1]
FONT = ART / 'brand/takudzidza/source/Inter-Variable.ttf'
font = ImageFont.truetype(str(FONT), 16)
font.set_variation_by_axes([14, 500])
for directory, target in [(ART/'assets',ART/'review/source-people.png'),(ART/'assets/cutouts',ART/'assets/cutouts/board.png')]:
    files = sorted(p for p in directory.glob('*.png') if p.name != 'board.png')
    board = Image.new('RGB', (2400, ((len(files)+5)//6)*400), '#FFF8F0')
    draw = ImageDraw.Draw(board)
    for i, path in enumerate(files):
        left, top = (i%6)*400, (i//6)*400
        for col, colour in enumerate(['#FFF8F0','#2B2D42']):
            x = left + col*200
            draw.rectangle((x,top,x+199,top+349),fill=colour)
            im = Image.open(path).convert('RGBA')
            im.thumbnail((192,330),Image.Resampling.LANCZOS)
            board.paste(im,(x+(200-im.width)//2,top+350-im.height),im)
        draw.text((left+8,top+365),path.stem,fill='#4A3010',font=font)
    board.save(target,optimize=True)
    if directory.name == 'cutouts':
        board.save(ART/'review/cutouts-overview.png',optimize=True)
print('Source and final cutout boards use Inter; all portraits preserve aspect ratio.')
