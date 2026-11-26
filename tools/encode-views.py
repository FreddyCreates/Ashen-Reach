"""Encode the offline fleet renders as alpha-preserving WebP textures."""
from pathlib import Path
import sys
from PIL import Image

source, destination = map(Path, sys.argv[1:])
for prefix in ('hero', 'flight', 'turn'):
    for image in source.glob(f'{prefix}-*.png'):
        with Image.open(image) as frame:
            frame.save(destination / (image.stem + '.webp'), quality=92, method=4)
