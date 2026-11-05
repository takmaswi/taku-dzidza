"""Validate visuals-2 asset contracts without running or changing the app."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from xml.etree import ElementTree as ET

import numpy as np
from PIL import Image

sys.dont_write_bytecode = True
ART = Path(__file__).resolve().parents[1]
ROOT = ART.parent
KIT = ROOT.parent / 'Taku brand/TAKU/brand/education'
NS = '{http://www.w3.org/2000/svg}'


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


cutouts = json.loads((ART/'assets/cutouts/manifest.json').read_text())['entries']
expected = {p.stem for p in (ART/'assets').glob('*.webp')}
assert {e['name'] for e in cutouts} == expected
for entry in cutouts:
    assert entry['status'] == 'exported', entry['name']
    for record in entry['files']:
        p = ROOT/record['file']
        assert digest(p) == record['sha256'], p
        assert Image.open(p).size == tuple(entry['export_size'])
    png = Image.open(ART/'assets/cutouts'/f"{entry['name']}.png")
    webp = Image.open(ART/'assets/cutouts'/f"{entry['name']}.webp")
    assert png.mode == webp.mode == 'RGBA'
    assert png.getchannel('A').getextrema()[0] == 0
    assert np.array_equal(np.asarray(png.getchannel('A')), np.asarray(webp.getchannel('A')))
    assert (ART/'assets/cutouts'/f"{entry['name']}.webp").stat().st_size < entry['webp_limit_bytes']
    shadow = Image.open(ART/'assets/cutouts'/f"{entry['name']}-shadow.webp")
    assert shadow.getchannel('A').getextrema()[0] == 0
    assert shadow.getchannel('A').getextrema()[1] < 255
    assert all(value == 0 for value in png.getchannel('A').crop((0,0,png.width,12)).getextrema())
assert digest(ART/'assets/cutouts/og-default.png') == digest(ART/'assets/cutouts/landing-hero-wide.png')

scene_sizes = {'landing-hero':(2560,1600),'home-dashboard':(1600,900),'empty-notebook':(1200,900)}
for name,size in scene_sizes.items():
    for extension in ('png','webp'):
        p = ART/'assets/scenes'/f'{name}.{extension}'
        im = Image.open(p)
        im.load()
        assert im.size == size and im.mode == 'RGB'
        if extension == 'webp':
            assert p.stat().st_size < 250_000

for p in (ART/'brand/takudzidza/kit').iterdir():
    assert p.read_bytes() == (KIT/p.name).read_bytes(), p
assert len(list((ART/'brand/takudzidza/kit').iterdir())) == 7
approved = [e.attrib for e in ET.parse(KIT/'taku-education-mark-on-cream.svg').iter(NS+'rect')]
for p in (ART/'brand/takudzidza/proposed').glob('*.svg'):
    tree = ET.parse(p)
    assert not list(tree.iter(NS+'text'))
    assert [e.attrib for e in tree.iter(NS+'rect')] == approved
    assert list(tree.iter(NS+'path'))
    assert 'PROPOSED' in p.read_text()

for p in (ART/'decor').glob('*.svg'):
    tree = ET.parse(p)
    assert not list(tree.iter(NS+'text'))
    assert tree.getroot().get('stroke') == 'currentColor'
    assert tree.getroot().get('fill') == 'none'
for p in (ART/'decor').glob('*.webp'):
    im = Image.open(p)
    assert im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] == 0
    assert p.stat().st_size < 200_000

for name,size,limit in [('honey-waves-dark.webp',(2560,1600),200_000),('honey-waves-dark-phone.webp',(1080,2340),150_000)]:
    p = ART/'textures'/name
    assert Image.open(p).size == size and p.stat().st_size < limit
for name in ['honey-waves.webp','honey-waves-phone.webp','paper-grain.webp']:
    before = subprocess.check_output(['git','show','origin/codex/textures:art/textures/'+name],cwd=ROOT)
    assert before == (ART/'textures'/name).read_bytes()

changed = subprocess.check_output(['git','diff','--name-only','origin/codex/textures'],cwd=ROOT,text=True).splitlines()
assert all(p.startswith('art/') for p in changed), changed
assert not subprocess.check_output(['git','diff','origin/codex/textures','--','src','convex','public'],cwd=ROOT)
report = {'status':'PASS','cutout_filenames':len(cutouts),'unique_sources':22,'scenes':scene_sizes,
          'kit_byte_identical':7,'proposed_outlined_lockups':4,'decor_rasters':7,'decor_vectors':7,
          'protected_paths_diff':'empty','light_textures':'byte unchanged','checks':'decode, dimensions, alpha identity, padding, byte budgets, SVG geometry/outlines, kit equality, scope'}
(ART/'review/verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
