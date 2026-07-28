"""One-off icon generator for the 출장 예약 PWA. Not shipped/used at runtime."""
from PIL import Image, ImageDraw

NAVY = (16, 24, 38, 255)      # #101826
AMBER = (232, 163, 61, 255)   # #E8A33D
AMBER_DIM = (232, 163, 61, 130)

def draw_mark(draw, size, margin_ratio):
    """Route mark: origin dot, bottom-left, dashed diagonal line, arrow nose top-right."""
    m = size * margin_ratio
    x0, y0 = m, size - m          # origin point (bottom-left)
    x1, y1 = size - m, m          # destination point (top-right)

    # origin dot
    r = size * 0.045
    draw.ellipse([x0 - r, y0 - r, x0 + r, y0 + r], fill=AMBER)

    # dashed diagonal line
    import math
    dist = math.hypot(x1 - x0, y1 - y0)
    dash_len = size * 0.045
    gap_len = size * 0.035
    n = int(dist / (dash_len + gap_len))
    ux, uy = (x1 - x0) / dist, (y1 - y0) / dist
    width = max(2, int(size * 0.028))
    pos = size * 0.09  # skip a bit past the origin dot
    while pos < dist - size * 0.12:  # stop before the arrow head
        sx, sy = x0 + ux * pos, y0 + uy * pos
        ex, ey = x0 + ux * min(pos + dash_len, dist), y0 + uy * min(pos + dash_len, dist)
        draw.line([sx, sy, ex, ey], fill=AMBER, width=width)
        pos += dash_len + gap_len

    # arrow head at destination (simple triangle pointing along the route)
    head = size * 0.075
    perp_x, perp_y = -uy, ux
    tip = (x1, y1)
    left = (x1 - ux * head - perp_x * head * 0.6, y1 - uy * head - perp_y * head * 0.6)
    right = (x1 - ux * head + perp_x * head * 0.6, y1 - uy * head + perp_y * head * 0.6)
    draw.polygon([tip, left, right], fill=AMBER)


def make_icon(size, margin_ratio, rounded, out_path):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if rounded:
        radius = int(size * 0.22)
        draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=NAVY)
    else:
        draw.rectangle([0, 0, size - 1, size - 1], fill=NAVY)
    draw_mark(draw, size, margin_ratio)
    img.save(out_path)


if __name__ == "__main__":
    make_icon(192, 0.26, True, "icons/icon-192.png")
    make_icon(512, 0.26, True, "icons/icon-512.png")
    # maskable: generous safe-zone padding, full-bleed background (OS applies its own mask)
    make_icon(192, 0.34, False, "icons/icon-192-maskable.png")
    make_icon(512, 0.34, False, "icons/icon-512-maskable.png")
    # apple touch icon: iOS applies its own rounding, no transparency, modest margin
    make_icon(180, 0.24, False, "icons/apple-touch-icon.png")
    print("icons written")
