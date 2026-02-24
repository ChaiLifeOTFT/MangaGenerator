#!/usr/bin/env python3
"""
MangaForge Page Compositor
Takes individual panel images + script JSON and composes them into
proper manga pages with panel borders, gutters, speech bubbles, and SFX.

Usage:
    python compose_pages.py /path/to/script.json /path/to/panels/ /path/to/output/
"""

import json
import os
import sys
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Page dimensions (standard manga tankoubon ~5x7.5 inches at 300 DPI)
PAGE_W = 1500
PAGE_H = 2250
MARGIN = 60
GUTTER = 24
BORDER_W = 3
BG_COLOR = (255, 255, 255)
BORDER_COLOR = (0, 0, 0)
BUBBLE_COLOR = (255, 255, 255)
BUBBLE_BORDER = (0, 0, 0)
SFX_COLOR = (0, 0, 0)

# Panel layout templates for 4-panel pages (manga reads right-to-left)
LAYOUTS_4 = [
    # Layout A: 2x2 grid
    [
        (0.0, 0.0, 0.5, 0.5),
        (0.5, 0.0, 1.0, 0.5),
        (0.0, 0.5, 0.5, 1.0),
        (0.5, 0.5, 1.0, 1.0),
    ],
    # Layout B: big top, two bottom, one side
    [
        (0.0, 0.0, 0.65, 0.45),
        (0.65, 0.0, 1.0, 0.45),
        (0.0, 0.45, 0.5, 1.0),
        (0.5, 0.45, 1.0, 1.0),
    ],
    # Layout C: one top-wide, one tall-left, two stacked right
    [
        (0.0, 0.0, 1.0, 0.35),
        (0.0, 0.35, 0.45, 1.0),
        (0.45, 0.35, 1.0, 0.65),
        (0.45, 0.65, 1.0, 1.0),
    ],
]

LAYOUTS_5 = [
    # Layout: top-wide, 2 middle, 2 bottom
    [
        (0.0, 0.0, 1.0, 0.3),
        (0.0, 0.3, 0.5, 0.6),
        (0.5, 0.3, 1.0, 0.6),
        (0.0, 0.6, 0.55, 1.0),
        (0.55, 0.6, 1.0, 1.0),
    ],
]


def get_font(size, bold=False):
    """Get a font, falling back to default if needed."""
    paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def fit_image(img, target_w, target_h):
    """Crop and resize image to fill target area (cover fit)."""
    iw, ih = img.size
    target_ratio = target_w / target_h
    img_ratio = iw / ih

    if img_ratio > target_ratio:
        # Image is wider — crop sides
        new_w = int(ih * target_ratio)
        offset = (iw - new_w) // 2
        img = img.crop((offset, 0, offset + new_w, ih))
    else:
        # Image is taller — crop top/bottom
        new_h = int(iw / target_ratio)
        offset = (ih - new_h) // 2
        img = img.crop((0, offset, iw, offset + new_h))

    return img.resize((target_w, target_h), Image.LANCZOS)


def draw_speech_bubble(draw, text, x, y, max_width=300, font=None):
    """Draw a speech bubble with text at position (x, y)."""
    if not text or not text.strip():
        return

    if font is None:
        font = get_font(22, bold=False)

    # Word-wrap text
    lines = []
    for part in text.split('\n'):
        wrapped = textwrap.wrap(part, width=max_width // 12)
        lines.extend(wrapped if wrapped else [''])

    # Calculate bubble size
    line_height = 26
    text_h = len(lines) * line_height
    text_w = max(font.getlength(line) for line in lines) if lines else 100
    padding = 16
    bw = int(text_w + padding * 2)
    bh = int(text_h + padding * 2)

    # Clamp position
    bx = max(10, min(x - bw // 2, PAGE_W - bw - 10))
    by = max(10, min(y - bh // 2, PAGE_H - bh - 10))

    # Draw bubble (rounded rectangle)
    draw.rounded_rectangle(
        [bx, by, bx + bw, by + bh],
        radius=12,
        fill=BUBBLE_COLOR,
        outline=BUBBLE_BORDER,
        width=2,
    )

    # Draw tail (small triangle pointing down)
    tail_x = bx + bw // 2
    tail_y = by + bh
    draw.polygon(
        [(tail_x - 8, tail_y - 2), (tail_x + 8, tail_y - 2), (tail_x, tail_y + 14)],
        fill=BUBBLE_COLOR,
        outline=BUBBLE_BORDER,
    )
    # Cover the outline at the base
    draw.line([(tail_x - 6, tail_y - 1), (tail_x + 6, tail_y - 1)], fill=BUBBLE_COLOR, width=3)

    # Draw text
    ty = by + padding
    for line in lines:
        lw = font.getlength(line)
        tx = bx + (bw - lw) / 2
        draw.text((tx, ty), line, fill=(0, 0, 0), font=font)
        ty += line_height


def draw_sfx(draw, text, x, y, font=None):
    """Draw manga SFX text (bold, angled, dramatic)."""
    if not text or not text.strip():
        return
    if font is None:
        font = get_font(36, bold=True)

    # Draw with outline effect
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            draw.text((x + dx, y + dy), text.upper(), fill=(255, 255, 255), font=font)
    draw.text((x, y), text.upper(), fill=SFX_COLOR, font=font)


def compose_page(panels_data, panel_images, page_num, output_dir):
    """Compose a single manga page from panels."""
    n = len(panels_data)

    if n <= 4:
        layout_idx = page_num % len(LAYOUTS_4)
        layout = LAYOUTS_4[layout_idx][:n]
    elif n == 5:
        layout = LAYOUTS_5[0]
    else:
        # Fall back to grid
        cols = 2
        rows = (n + 1) // 2
        layout = []
        for i in range(n):
            r, c = divmod(i, cols)
            layout.append((c / cols, r / rows, (c + 1) / cols, (r + 1) / rows))

    # Create page
    page = Image.new('RGB', (PAGE_W, PAGE_H), BG_COLOR)
    draw = ImageDraw.Draw(page)

    # Content area
    cx, cy = MARGIN, MARGIN
    cw = PAGE_W - 2 * MARGIN
    ch = PAGE_H - 2 * MARGIN - 40  # Leave room for page number

    font_dialogue = get_font(20)
    font_sfx = get_font(32, bold=True)

    for i, (panel_info, panel_img) in enumerate(zip(panels_data, panel_images)):
        if i >= len(layout):
            break

        lx1, ly1, lx2, ly2 = layout[i]

        # Calculate pixel coordinates
        px = cx + int(lx1 * cw) + GUTTER // 2
        py = cy + int(ly1 * ch) + GUTTER // 2
        pw = int((lx2 - lx1) * cw) - GUTTER
        ph = int((ly2 - ly1) * ch) - GUTTER

        if pw < 50 or ph < 50:
            continue

        # Fit and paste panel image
        if panel_img:
            fitted = fit_image(panel_img, pw, ph)
            page.paste(fitted, (px, py))

        # Draw border
        draw.rectangle([px, py, px + pw, py + ph], outline=BORDER_COLOR, width=BORDER_W)

        # Add dialogue bubbles
        dialogues = panel_info.get('dialogue', [])
        for j, dlg in enumerate(dialogues[:2]):  # Max 2 bubbles per panel
            if not dlg or dlg == '(no dialogue)':
                continue
            # Clean dialogue prefix (remove "Kai: ", "Echo: ", etc.)
            clean = dlg.split(': ', 1)[-1] if ': ' in dlg else dlg
            bx = px + pw // 3 + (j * pw // 3)
            by = py + 30 + (j * 60)
            draw_speech_bubble(draw, clean, bx, by, max_width=min(pw - 40, 280), font=font_dialogue)

        # Add SFX
        sfx_list = panel_info.get('sfx', [])
        for k, sfx in enumerate(sfx_list[:1]):  # Max 1 SFX per panel
            sx = px + pw - 120
            sy = py + ph - 60
            draw_sfx(draw, sfx, sx, sy, font=font_sfx)

    # Page number
    page_font = get_font(18)
    pn_text = str(page_num)
    pn_w = page_font.getlength(pn_text)
    draw.text((PAGE_W // 2 - pn_w // 2, PAGE_H - MARGIN + 10), pn_text, fill=(100, 100, 100), font=page_font)

    # Save
    out_path = os.path.join(output_dir, f'page_{page_num:02d}.png')
    page.save(out_path, 'PNG', quality=95)
    print(f'  Page {page_num}: {n} panels → {out_path} ({os.path.getsize(out_path) // 1024}KB)')
    return out_path


def compose_chapter(script_path, panels_dir, output_dir):
    """Compose an entire manga chapter."""
    with open(script_path) as f:
        script = json.load(f)

    title = script.get('title', 'Untitled')
    pages = script.get('pages', [])

    os.makedirs(output_dir, exist_ok=True)
    print(f'Composing "{title}" — {len(pages)} pages')

    composed_pages = []

    for page in pages:
        page_num = page.get('number', len(composed_pages) + 1)
        panels = page.get('panels', [])

        # Load panel images
        panel_images = []
        for panel in panels:
            pid = panel.get('id', '')
            # Try different naming conventions
            fname = f'panel_{pid.replace("-", "_")}.png'
            fpath = os.path.join(panels_dir, fname)
            if os.path.exists(fpath):
                panel_images.append(Image.open(fpath))
            else:
                # Try with page-panel naming
                print(f'    Warning: {fname} not found, using placeholder')
                placeholder = Image.new('RGB', (512, 512), (200, 200, 200))
                panel_images.append(placeholder)

        out = compose_page(panels, panel_images, page_num, output_dir)
        composed_pages.append(out)

        # Close images to free memory
        for img in panel_images:
            img.close()

    # Create title page
    title_page = Image.new('RGB', (PAGE_W, PAGE_H), BG_COLOR)
    td = ImageDraw.Draw(title_page)
    title_font = get_font(72, bold=True)
    subtitle_font = get_font(28)

    # Center title
    tw = title_font.getlength(title)
    td.text((PAGE_W // 2 - tw // 2, PAGE_H // 2 - 80), title, fill=(0, 0, 0), font=title_font)

    # Subtitle
    subtitle = "Chapter 1"
    sw = subtitle_font.getlength(subtitle)
    td.text((PAGE_W // 2 - sw // 2, PAGE_H // 2 + 20), subtitle, fill=(80, 80, 80), font=subtitle_font)

    # Credit
    credit = "Generated by MangaForge"
    cw = subtitle_font.getlength(credit)
    td.text((PAGE_W // 2 - cw // 2, PAGE_H // 2 + 80), credit, fill=(120, 120, 120), font=subtitle_font)

    title_path = os.path.join(output_dir, 'page_00_title.png')
    title_page.save(title_path, 'PNG')
    print(f'  Title page → {title_path}')

    # Create CBZ with composed pages
    import zipfile
    cbz_name = title.replace(' ', '_') + '_composed.cbz'
    cbz_path = os.path.join(output_dir, cbz_name)
    with zipfile.ZipFile(cbz_path, 'w', zipfile.ZIP_DEFLATED) as cbz:
        cbz.write(title_path, 'page_00_title.png')
        for cp in composed_pages:
            cbz.write(cp, os.path.basename(cp))
        cbz.writestr('script.json', json.dumps(script, indent=2))

    size_mb = os.path.getsize(cbz_path) / (1024 * 1024)
    print(f'\nComposed CBZ: {cbz_path} ({size_mb:.1f}MB)')
    return cbz_path


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print(f'Usage: {sys.argv[0]} <script.json> <panels_dir> <output_dir>')
        sys.exit(1)

    compose_chapter(sys.argv[1], sys.argv[2], sys.argv[3])
