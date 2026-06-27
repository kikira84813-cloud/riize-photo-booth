from collections import deque
from math import cos, pi, sin
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_DIR = ROOT / "public" / "templates"
MASK_DIR = TEMPLATE_DIR / "masks"
OVERLAY_DIR = TEMPLATE_DIR / "overlays"


SLOTS = [
    (0.06, 0.07, 0.45, 0.82),
    (0.06, 0.08, 0.38, 0.80),
    (0.07, 0.09, 0.36, 0.78),
    (0.06, 0.09, 0.32, 0.72),
    (0.22, 0.17, 0.34, 0.58),
    (0.12, 0.15, 0.42, 0.48),
    (0.08, 0.12, 0.35, 0.74),
    (0.16, 0.15, 0.34, 0.55),
    (0.06, 0.08, 0.47, 0.77),
    (0.06, 0.08, 0.40, 0.78),
    (0.06, 0.09, 0.38, 0.62),
    (0.06, 0.08, 0.31, 0.75),
    (0.12, 0.24, 0.36, 0.48),
    (0.11, 0.12, 0.43, 0.53),
    (0.07, 0.12, 0.36, 0.72),
    (0.43, 0.16, 0.43, 0.56),
    (0.06, 0.08, 0.45, 0.82),
    (0.06, 0.08, 0.43, 0.76),
    (0.06, 0.08, 0.42, 0.78),
    (0.06, 0.08, 0.43, 0.76),
    (0.16, 0.14, 0.36, 0.54),
    (0.57, 0.13, 0.32, 0.49),
    (0.08, 0.12, 0.43, 0.45),
    (0.13, 0.21, 0.40, 0.46),
    (0.06, 0.08, 0.45, 0.76),
    (0.06, 0.08, 0.42, 0.77),
    (0.06, 0.08, 0.42, 0.76),
    (0.06, 0.08, 0.40, 0.76),
    (0.06, 0.09, 0.47, 0.56),
    (0.50, 0.15, 0.31, 0.47),
    (0.48, 0.11, 0.38, 0.55),
    (0.42, 0.44, 0.20, 0.25),
    (0.06, 0.08, 0.40, 0.76),
    (0.08, 0.08, 0.44, 0.73),
    (0.06, 0.08, 0.39, 0.76),
    (0.06, 0.08, 0.43, 0.77),
    (0.53, 0.13, 0.42, 0.73),
    (0.50, 0.18, 0.35, 0.50),
    (0.46, 0.20, 0.44, 0.62),
    (0.10, 0.12, 0.32, 0.63),
    (0.06, 0.08, 0.43, 0.77),
    (0.06, 0.08, 0.43, 0.70),
    (0.06, 0.08, 0.39, 0.76),
    (0.06, 0.08, 0.37, 0.63),
    (0.39, 0.12, 0.25, 0.31),
    (0.34, 0.18, 0.32, 0.55),
    (0.31, 0.43, 0.38, 0.38),
    (0.14, 0.18, 0.49, 0.58),
]

EXPANDED_COMPONENT_TEMPLATES = {
    5, 6, 8, 13, 14, 16, 21, 22, 24, 29, 30, 31,
    37, 38, 39, 40, 45, 46, 47, 48
}

PLAIN_WHITE_TEMPLATES = {
    1, 2, 3, 4, 7, 9, 10, 11, 12, 15,
    17, 18, 19, 20, 25, 26, 27, 28,
    33, 34, 35, 36, 41, 42, 43, 44
}

EXPANDED_ROIS = {
    5: (0.14, 0.06, 0.55, 0.78),
    6: (0.08, 0.08, 0.78, 0.58),
    8: (0.09, 0.07, 0.64, 0.72),
    13: (0.08, 0.20, 0.54, 0.58),
    14: (0.08, 0.06, 0.78, 0.66),
    16: (0.32, 0.07, 0.60, 0.72),
    21: (0.10, 0.06, 0.78, 0.62),
    22: (0.52, 0.09, 0.38, 0.58),
    24: (0.08, 0.12, 0.62, 0.60),
    29: (0.04, 0.04, 0.56, 0.68),
    30: (0.28, 0.06, 0.62, 0.72),
    31: (0.36, 0.03, 0.58, 0.70),
    37: (0.51, 0.12, 0.42, 0.73),
    38: (0.36, 0.08, 0.54, 0.66),
    39: (0.35, 0.13, 0.58, 0.70),
    40: (0.07, 0.09, 0.36, 0.68),
    45: (0.34, 0.05, 0.36, 0.58),
    46: (0.28, 0.12, 0.46, 0.68),
    47: (0.26, 0.31, 0.48, 0.52),
    48: (0.05, 0.08, 0.62, 0.76),
}

SEEDED_TEMPLATES = {
    5, 6, 8, 13, 14, 16, 21, 22, 24, 29, 30, 31, 37, 38, 39, 40, 45, 46, 47, 48
}

MANUAL_SHAPES = {
    21: ("heart", (0.10, 0.06, 0.78, 0.64)),
    22: ("ellipse", (0.53, 0.09, 0.36, 0.56)),
    29: ("heart", (0.03, 0.02, 0.58, 0.74)),
    30: ("ellipse", (0.28, 0.06, 0.62, 0.72)),
    37: ("rounded", (0.52, 0.13, 0.41, 0.73)),
    40: ("rounded", (0.10, 0.12, 0.33, 0.63)),
    45: ("ellipse", (0.34, 0.05, 0.36, 0.58)),
    48: ("ellipse", (0.06, 0.12, 0.62, 0.72)),
}

SEEDS = {
    1: [(0.08, 0.10), (0.18, 0.45), (0.35, 0.12), (0.88, 0.12), (0.10, 0.82)],
    2: [(0.08, 0.10), (0.22, 0.45), (0.38, 0.12), (0.18, 0.82)],
    3: [(0.08, 0.10), (0.23, 0.45), (0.40, 0.12), (0.14, 0.82)],
    4: [(0.08, 0.10), (0.23, 0.35), (0.42, 0.14), (0.14, 0.82)],
    5: [(0.38, 0.42), (0.30, 0.32), (0.46, 0.28)],
    6: [(0.30, 0.30), (0.44, 0.24), (0.20, 0.35)],
    8: [(0.34, 0.36), (0.24, 0.28), (0.43, 0.23)],
    9: [(0.08, 0.10), (0.25, 0.45), (0.46, 0.12), (0.12, 0.82)],
    10: [(0.08, 0.10), (0.26, 0.44), (0.44, 0.12), (0.12, 0.82)],
    11: [(0.08, 0.10), (0.24, 0.36), (0.46, 0.12), (0.12, 0.70)],
    12: [(0.08, 0.10), (0.22, 0.38), (0.34, 0.12), (0.12, 0.80)],
    13: [(0.33, 0.44), (0.22, 0.38), (0.44, 0.34)],
    14: [(0.30, 0.32), (0.47, 0.30), (0.20, 0.42)],
    15: [(0.08, 0.12), (0.24, 0.44), (0.40, 0.14), (0.12, 0.82)],
    16: [(0.62, 0.39), (0.52, 0.30), (0.73, 0.30)],
    17: [(0.08, 0.10), (0.20, 0.44), (0.44, 0.12), (0.12, 0.82)],
    18: [(0.08, 0.10), (0.24, 0.44), (0.44, 0.12), (0.12, 0.80)],
    19: [(0.08, 0.10), (0.24, 0.44), (0.44, 0.12), (0.12, 0.80)],
    20: [(0.08, 0.10), (0.24, 0.44), (0.44, 0.12), (0.12, 0.80)],
    21: [(0.35, 0.30), (0.52, 0.29), (0.23, 0.39)],
    22: [(0.73, 0.34), (0.66, 0.27), (0.80, 0.42)],
    24: [(0.36, 0.42), (0.27, 0.31), (0.48, 0.30)],
    25: [(0.08, 0.10), (0.22, 0.44), (0.44, 0.12), (0.12, 0.82)],
    26: [(0.08, 0.10), (0.22, 0.44), (0.42, 0.12), (0.12, 0.82)],
    27: [(0.08, 0.10), (0.22, 0.44), (0.42, 0.12), (0.12, 0.82)],
    28: [(0.08, 0.10), (0.22, 0.44), (0.42, 0.12), (0.12, 0.82)],
    29: [(0.27, 0.28), (0.17, 0.24), (0.39, 0.23)],
    30: [(0.62, 0.34), (0.55, 0.26), (0.72, 0.47)],
    31: [(0.62, 0.30), (0.75, 0.42), (0.52, 0.22)],
    37: [(0.73, 0.48), (0.65, 0.28), (0.84, 0.70)],
    38: [(0.66, 0.34), (0.56, 0.26), (0.78, 0.48)],
    39: [(0.66, 0.48), (0.78, 0.32), (0.54, 0.66)],
    40: [(0.25, 0.40), (0.20, 0.24), (0.31, 0.60)],
    41: [(0.08, 0.10), (0.24, 0.44), (0.44, 0.12), (0.12, 0.82)],
    42: [(0.08, 0.10), (0.24, 0.44), (0.44, 0.12), (0.12, 0.74)],
    43: [(0.08, 0.10), (0.23, 0.44), (0.40, 0.12), (0.12, 0.82)],
    44: [(0.08, 0.10), (0.22, 0.38), (0.38, 0.12), (0.12, 0.70)],
    45: [(0.50, 0.23), (0.44, 0.19), (0.56, 0.33)],
    46: [(0.50, 0.42), (0.40, 0.30), (0.60, 0.62)],
    47: [(0.50, 0.58), (0.42, 0.50), (0.58, 0.68)],
    48: [(0.34, 0.40), (0.19, 0.34), (0.50, 0.50)],
}


def is_blank_pixel(pixel):
    r, g, b = pixel
    mx = max(r, g, b)
    mn = min(r, g, b)
    saturation = mx - mn
    # Captures white cards, soft gray photo holes, and glow centers while
    # rejecting skin, hair, clothing, colored stickers, and black text.
    return mx >= 232 and (r + g + b) / 3 >= 226 and saturation <= 34


def is_soft_blank_pixel(pixel):
    r, g, b = pixel
    mx = max(r, g, b)
    mn = min(r, g, b)
    saturation = mx - mn
    average = (r + g + b) / 3
    return mx >= 232 and average >= 226 and saturation <= 34


def is_canvas_blank_pixel(pixel):
    r, g, b = pixel
    mx = max(r, g, b)
    mn = min(r, g, b)
    saturation = mx - mn
    average = (r + g + b) / 3
    # Selects white, light gray, and soft glow backgrounds while rejecting
    # skin, denim, hair, black text, saturated stickers, and most clothing.
    return average >= 228 and mx >= 234 and saturation <= 32


def build_component_mask(image, slot):
    width, height = image.size
    sx = max(0, int(slot[0] * width))
    sy = max(0, int(slot[1] * height))
    sw = min(width - sx, int(slot[2] * width))
    sh = min(height - sy, int(slot[3] * height))
    pixels = image.load()
    local_blank = [[False] * sw for _ in range(sh)]

    for y in range(sh):
        for x in range(sw):
            local_blank[y][x] = is_blank_pixel(pixels[sx + x, sy + y])

    visited = [[False] * sw for _ in range(sh)]
    center_x0 = int(sw * 0.2)
    center_x1 = int(sw * 0.8)
    center_y0 = int(sh * 0.2)
    center_y1 = int(sh * 0.8)
    kept = []

    for y in range(sh):
        for x in range(sw):
            if visited[y][x] or not local_blank[y][x]:
                continue
            q = deque([(x, y)])
            visited[y][x] = True
            component = []
            center_hits = 0

            while q:
                cx, cy = q.popleft()
                component.append((cx, cy))
                if center_x0 <= cx <= center_x1 and center_y0 <= cy <= center_y1:
                    center_hits += 1
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < sw and 0 <= ny < sh and not visited[ny][nx] and local_blank[ny][nx]:
                        visited[ny][nx] = True
                        q.append((nx, ny))

            area = len(component)
            intersects_center = center_hits > max(20, area * 0.03)
            is_large = area > sw * sh * 0.04
            if is_large and intersects_center:
                kept.extend(component)

    mask = Image.new("L", (width, height), 0)
    mask_pixels = mask.load()
    for x, y in kept:
        mask_pixels[sx + x, sy + y] = 255

    # Smooth JPEG edges and fill tiny holes without expanding into the idol.
    mask = mask.filter(ImageFilter.MaxFilter(5))
    mask = mask.filter(ImageFilter.MinFilter(3))
    mask = mask.filter(ImageFilter.GaussianBlur(0.65))
    return mask


def expanded_roi(slot):
    x, y, w, h = slot
    pad_x = w * 0.45
    pad_y = h * 0.35
    nx = max(0.0, x - pad_x)
    ny = max(0.0, y - pad_y)
    x2 = min(1.0, x + w + pad_x)
    y2 = min(1.0, y + h + pad_y)
    return (nx, ny, x2 - nx, y2 - ny)


def roi_box(size, roi):
    width, height = size
    rx = max(0, int(roi[0] * width))
    ry = max(0, int(roi[1] * height))
    rw = min(width - rx, int(roi[2] * width))
    rh = min(height - ry, int(roi[3] * height))
    return rx, ry, rw, rh


def build_seeded_mask(image, roi, seeds):
    width, height = image.size
    rx, ry, rw, rh = roi_box(image.size, roi)
    pixels = image.load()
    blank = [[False] * rw for _ in range(rh)]

    for y in range(rh):
        for x in range(rw):
            blank[y][x] = is_soft_blank_pixel(pixels[rx + x, ry + y])

    q = deque()
    visited = [[False] * rw for _ in range(rh)]
    for sx, sy in seeds:
        px = int(sx * width) - rx
        py = int(sy * height) - ry
        for dy in range(-8, 9):
            for dx in range(-8, 9):
                nx = px + dx
                ny = py + dy
                if 0 <= nx < rw and 0 <= ny < rh and blank[ny][nx] and not visited[ny][nx]:
                    visited[ny][nx] = True
                    q.append((nx, ny))

    mask = Image.new("L", (width, height), 0)
    mask_pixels = mask.load()
    while q:
        cx, cy = q.popleft()
        mask_pixels[rx + cx, ry + cy] = 255
        for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
            if 0 <= nx < rw and 0 <= ny < rh and not visited[ny][nx] and blank[ny][nx]:
                visited[ny][nx] = True
                q.append((nx, ny))

    # Close tiny JPEG breaks without bridging into skin or light clothing.
    mask = mask.filter(ImageFilter.MaxFilter(5))
    mask = mask.filter(ImageFilter.MinFilter(3))
    mask = ImageOps.autocontrast(mask)
    mask = mask.filter(ImageFilter.GaussianBlur(0.35))
    return mask


def build_blank_canvas_mask(image, roi):
    width, height = image.size
    rx, ry, rw, rh = roi_box(image.size, roi)
    crop = image.crop((rx, ry, rx + rw, ry + rh)).convert("RGB")
    gray = ImageOps.grayscale(crop)
    inverted = ImageOps.invert(crop)
    saturation = crop.convert("HSV").getchannel("S")

    bright = gray.point(lambda value: 255 if value >= 214 else 0)
    low_saturation = saturation.point(lambda value: 255 if value <= 58 else 0)
    local_mask = ImageChops.multiply(bright, low_saturation)

    mask = Image.new("L", (width, height), 0)
    mask.paste(local_mask, (rx, ry))

    # Fill small JPEG cracks in the background, but shrink back so edges do
    # not eat into stickers or the idol cutout.
    mask = mask.filter(ImageFilter.MaxFilter(7))
    mask = mask.filter(ImageFilter.MinFilter(5))
    mask = mask.filter(ImageFilter.GaussianBlur(0.55))
    return mask


def heart_points(box):
    x, y, x2, y2 = box
    w = x2 - x
    h = y2 - y
    points = []
    for i in range(220):
        t = (i / 220) * 2 * pi
        hx = 16 * (sin(t) ** 3)
        hy = 13 * cos(t) - 5 * cos(2 * t) - 2 * cos(3 * t) - cos(4 * t)
        points.append((x + w * (0.5 + hx / 34), y + h * (0.54 - hy / 32)))
    return points


def build_manual_shape_mask(image, shape, roi):
    width, height = image.size
    rx, ry, rw, rh = roi_box(image.size, roi)
    box = (rx, ry, rx + rw, ry + rh)
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)

    if shape == "heart":
        draw.polygon(heart_points(box), fill=255)
    elif shape == "ellipse":
        draw.ellipse(box, fill=255)
    else:
        radius = int(min(rw, rh) * 0.055)
        draw.rounded_rectangle(box, radius=radius, fill=255)

    return mask.filter(ImageFilter.GaussianBlur(0.65))


def build_expanded_component_mask(image, slot, roi):
    width, height = image.size
    sx = max(0, int(slot[0] * width))
    sy = max(0, int(slot[1] * height))
    sw = min(width - sx, int(slot[2] * width))
    sh = min(height - sy, int(slot[3] * height))
    rx = max(0, int(roi[0] * width))
    ry = max(0, int(roi[1] * height))
    rw = min(width - rx, int(roi[2] * width))
    rh = min(height - ry, int(roi[3] * height))
    pixels = image.load()
    blank = [[False] * rw for _ in range(rh)]

    for y in range(rh):
        for x in range(rw):
            blank[y][x] = is_blank_pixel(pixels[rx + x, ry + y])

    visited = [[False] * rw for _ in range(rh)]
    kept = []

    for y in range(rh):
        for x in range(rw):
            if visited[y][x] or not blank[y][x]:
                continue

            q = deque([(x, y)])
            visited[y][x] = True
            component = []
            slot_hits = 0

            while q:
                cx, cy = q.popleft()
                component.append((cx, cy))
                gx = rx + cx
                gy = ry + cy
                if sx <= gx < sx + sw and sy <= gy < sy + sh:
                    slot_hits += 1
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < rw and 0 <= ny < rh and not visited[ny][nx] and blank[ny][nx]:
                        visited[ny][nx] = True
                        q.append((nx, ny))

            if len(component) < width * height * 0.003:
                continue
            if slot_hits > sw * sh * 0.04 or slot_hits > len(component) * 0.06:
                kept.extend(component)

    mask = Image.new("L", (width, height), 0)
    mask_pixels = mask.load()
    for x, y in kept:
        mask_pixels[rx + x, ry + y] = 255

    mask = mask.filter(ImageFilter.MaxFilter(5))
    mask = mask.filter(ImageFilter.MinFilter(3))
    mask = mask.filter(ImageFilter.GaussianBlur(0.65))
    return mask


def generate():
    MASK_DIR.mkdir(parents=True, exist_ok=True)
    OVERLAY_DIR.mkdir(parents=True, exist_ok=True)

    for index, slot in enumerate(SLOTS, start=1):
        template_path = TEMPLATE_DIR / f"template-{index:03d}.jpg"
        image = Image.open(template_path).convert("RGB")
        if index in PLAIN_WHITE_TEMPLATES:
            mask = build_seeded_mask(
                image,
                (0.035, 0.035, 0.93, 0.89),
                SEEDS.get(index, [(slot[0] + slot[2] / 2, slot[1] + slot[3] / 2)]),
            )
        elif index in MANUAL_SHAPES:
            shape, roi = MANUAL_SHAPES[index]
            shape_mask = build_manual_shape_mask(image, shape, roi)
            blank_mask = build_blank_canvas_mask(image, roi)
            mask = Image.composite(blank_mask, Image.new("L", image.size, 0), shape_mask)
        elif index in SEEDED_TEMPLATES:
            roi = EXPANDED_ROIS.get(index, expanded_roi(slot))
            mask = build_seeded_mask(
                image,
                roi,
                SEEDS.get(index, [(slot[0] + slot[2] / 2, slot[1] + slot[3] / 2)]),
            )
        elif index in EXPANDED_COMPONENT_TEMPLATES:
            mask = build_expanded_component_mask(image, slot, EXPANDED_ROIS.get(index, expanded_roi(slot)))
        else:
            mask = build_component_mask(image, slot)
        mask.save(MASK_DIR / f"mask-{index:03d}.png")

        overlay = image.convert("RGBA")
        alpha = overlay.getchannel("A")
        alpha_pixels = alpha.load()
        mask_pixels = mask.load()
        width, height = image.size
        for y in range(height):
            for x in range(width):
                value = mask_pixels[x, y]
                if value >= 220:
                    alpha_pixels[x, y] = 0
                elif value >= 120:
                    alpha_pixels[x, y] = min(alpha_pixels[x, y], 255 - value)
        overlay.putalpha(alpha)
        overlay.save(OVERLAY_DIR / f"overlay-{index:03d}.png")
        bbox = mask.getbbox()
        print(f"template-{index:03d}: mask bbox={bbox}")


if __name__ == "__main__":
    generate()
