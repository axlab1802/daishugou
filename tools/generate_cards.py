import base64
import json
from pathlib import Path

SUITS = ["heart", "club", "diamond", "spade"]

RANK_LABELS = {
    "11": "J",
    "12": "Q",
    "13": "K",
    "A": "A",
}


def load_layout(layout_path: Path) -> dict:
    with layout_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def rank_label(rank_key: str) -> str:
    return RANK_LABELS.get(rank_key, rank_key)


def svg_for_card(layout: dict, rank_key: str, image_href: str) -> str:
    canvas = layout["canvas"]
    frame = layout["frame"]
    art = layout["art"]
    rank_top = layout["rankTop"]
    rank_bottom = layout["rankBottom"]
    title = layout["title"]
    rank_color = layout.get("rankColor", "#2b1a10")
    rank_top_anchor = rank_top.get("anchor", "middle")
    rank_bottom_anchor = rank_bottom.get("anchor", "middle")

    label = rank_label(rank_key)
    title_text = layout.get("titles", {}).get(rank_key, label)

    inner_x = canvas["innerPadding"] * 2
    inner_y = canvas["innerPadding"] * 2
    inner_w = canvas["width"] - canvas["innerPadding"] * 4
    inner_h = canvas["height"] - canvas["innerPadding"] * 4

    return f"""<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{canvas['width']}\" height=\"{canvas['height']}\" viewBox=\"0 0 {canvas['width']} {canvas['height']}\">
  <defs>
    <linearGradient id=\"cardGlow\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">
      <stop offset=\"0%\" stop-color=\"#ffffff\"/>
      <stop offset=\"100%\" stop-color=\"#f1e6d4\"/>
    </linearGradient>
    <linearGradient id=\"frameWood\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">
      <stop offset=\"0%\" stop-color=\"#7f5b3a\"/>
      <stop offset=\"55%\" stop-color=\"#b68a60\"/>
      <stop offset=\"100%\" stop-color=\"#7f5b3a\"/>
    </linearGradient>
    <clipPath id=\"artClip\">
      <rect x=\"{art['x']}\" y=\"{art['y']}\" width=\"{art['width']}\" height=\"{art['height']}\" rx=\"{art['radius']}\" />
    </clipPath>
  </defs>

  <rect x=\"{canvas['innerPadding']}\" y=\"{canvas['innerPadding']}\" width=\"{canvas['width'] - canvas['innerPadding'] * 2}\" height=\"{canvas['height'] - canvas['innerPadding'] * 2}\" rx=\"{canvas['radius']}\" fill=\"url(#cardGlow)\" stroke=\"#2c1b10\" stroke-width=\"{canvas['border']}\" />
  <rect x=\"{inner_x}\" y=\"{inner_y}\" width=\"{inner_w}\" height=\"{inner_h}\" rx=\"{canvas['radius'] - 6}\" fill=\"none\" stroke=\"#d7c7b4\" stroke-width=\"{canvas['innerBorder']}\" />

  <g font-family=\"Garamond, serif\" font-weight=\"700\" fill=\"{rank_color}\">
    <text x=\"{rank_top['x']}\" y=\"{rank_top['y']}\" font-size=\"{rank_top['fontSize']}\" text-anchor=\"{rank_top_anchor}\">{label}</text>
  </g>
  <g transform=\"translate({rank_bottom['translateX']} {rank_bottom['translateY']}) rotate({rank_bottom['rotate']})\" font-family=\"Garamond, serif\" font-weight=\"700\" fill=\"{rank_color}\">
    <text x=\"{rank_bottom['x']}\" y=\"{rank_bottom['y']}\" font-size=\"{rank_bottom['fontSize']}\" text-anchor=\"{rank_bottom_anchor}\">{label}</text>
  </g>

  <rect x=\"{frame['x']}\" y=\"{frame['y']}\" width=\"{frame['width']}\" height=\"{frame['height']}\" rx=\"{frame['radius']}\" fill=\"url(#frameWood)\" stroke=\"#3c2516\" stroke-width=\"4\" />
  <rect x=\"{art['x']}\" y=\"{art['y']}\" width=\"{art['width']}\" height=\"{art['height']}\" rx=\"{art['radius']}\" fill=\"#efe4d2\" stroke=\"#3c2516\" stroke-width=\"2\" />
  <image href=\"{image_href}\" x=\"{art['x']}\" y=\"{art['y']}\" width=\"{art['width']}\" height=\"{art['height']}\" preserveAspectRatio=\"xMidYMid meet\" clip-path=\"url(#artClip)\" />

  <text x=\"{title['x']}\" y=\"{title['y']}\" text-anchor=\"middle\" font-family=\"Garamond, serif\" font-weight=\"900\" font-size=\"{title['fontSize']}\" fill=\"#f4e4c1\" stroke=\"#2c1810\" stroke-width=\"2\" paint-order=\"stroke fill\">{title_text}</text>
</svg>
"""


def generate_all(layout_path: Path, assets_dir: Path, output_dir: Path) -> None:
    layout = load_layout(layout_path)
    output_dir.mkdir(parents=True, exist_ok=True)

    for image_path in sorted(assets_dir.glob("*.png")):
        rank_key = image_path.stem
        if rank_key.lower() == "joker":
            continue
        if rank_key not in layout.get("titles", {}) and rank_key not in [str(n) for n in range(2, 14)] + ["A"]:
            continue
        encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
        image_href = f"data:image/png;base64,{encoded}"
        for suit_name in SUITS:
            svg = svg_for_card(layout, rank_key, image_href)
            out_path = output_dir / f"card_{rank_key}_{suit_name}.svg"
            out_path.write_text(svg, encoding="utf-8")


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    layout_path = root / "tools" / "card_layout.json"
    assets_dir = root / "assets"
    output_dir = assets_dir / "generated"
    generate_all(layout_path, assets_dir, output_dir)
    print(f"Generated cards in {output_dir}")
