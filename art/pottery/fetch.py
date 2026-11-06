"""Download Rudy's CC-BY 4.0 pottery wheel and kiln via Sketchfab.
Run: bash scripts/with-env.sh python3 art/pottery/fetch.py.
Credentials stay in the environment; the downloaded archive is data only.
"""
import io
import json
import os
from pathlib import Path
import urllib.request
import zipfile

MODELS = {'wheel': 'a1f36933a3144e6a80bb7f95c809ac1e', 'kiln': '79646682fe354aaabd00228b489017b4'}

def api(uid, suffix):
    request = urllib.request.Request(
        f'https://api.sketchfab.com/v3/models/{uid}{suffix}',
        headers={'Authorization': 'Token ' + os.environ['SKETCHFAB_API_TOKEN']},
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.load(response)

for name, uid in MODELS.items():
    root = Path('/tmp/daydaze-pottery') / name
    if (root / 'scene.gltf').exists():
        continue
    metadata = api(uid, '')
    if metadata['license']['slug'] != 'by':
        raise ValueError('Expected CC-BY license')
    url = api(uid, '/download')['gltf']['url']
    with urllib.request.urlopen(url, timeout=120) as response:
        archive = zipfile.ZipFile(io.BytesIO(response.read()))
    root.mkdir(parents=True, exist_ok=True)
    for entry in archive.infolist():
        if not (root / entry.filename).resolve().is_relative_to(root):
            raise ValueError('Unsafe archive path')
    archive.extractall(root)
    print('Downloaded CC-BY model to', root)
