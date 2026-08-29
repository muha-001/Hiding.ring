from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
index = ROOT / "index.html"
source = index.read_text(encoding="utf-8")
style_match = re.search(r"<style>\s*(.*?)\s*</style>", source, re.S)
script_match = re.search(r"<script>\s*(.*?)\s*</script>", source, re.S)
if not style_match or not script_match:
    raise SystemExit("style/script blocks not found")

(ROOT / "src/css").mkdir(parents=True, exist_ok=True)
(ROOT / "src/js").mkdir(parents=True, exist_ok=True)
(ROOT / "tools").mkdir(parents=True, exist_ok=True)
(ROOT / "src/css/styles.css").write_text(style_match.group(1).strip() + "\n", encoding="utf-8")

# Keep the original JavaScript unchanged to guarantee gameplay parity.
app_js = script_match.group(1).strip() + "\n\n"
app_js += """// Centralized event binding: behavior is identical to the original inline handlers.\ndocument.querySelector('#audioToggle').addEventListener('click', toggleAudio);\ndocument.querySelectorAll('[data-level]').forEach((card) => {\n    card.addEventListener('click', () => startGame(card.dataset.level));\n});\ndocument.querySelectorAll('[data-action]').forEach((control) => {\n    const actions = {\n        'lock-selection': lockSelection,\n        'eliminate-hand': eliminateHand,\n        'reveal-result': revealResult,\n        'show-level-screen': showLevelScreen\n    };\n    const action = actions[control.dataset.action];\n    if (action) control.addEventListener('click', action);\n});\n"""
(ROOT / "src/js/app.js").write_text(app_js, encoding="utf-8")

body_start = source.index("<body>")
body_end = source.index("</body>") + len("</body>")
body = source[body_start:body_end]
for old, new in {
    'onclick="toggleAudio()"': 'data-action="toggle-audio"',
    "onclick=\"startGame('beginner')\"": 'data-level="beginner"',
    "onclick=\"startGame('pro')\"": 'data-level="pro"',
    "onclick=\"startGame('legendary')\"": 'data-level="legendary"',
    'onclick="lockSelection()"': 'data-action="lock-selection"',
    'onclick="eliminateHand()"': 'data-action="eliminate-hand"',
    'onclick="revealResult()"': 'data-action="reveal-result"',
    'onclick="showLevelScreen()"': 'data-action="show-level-screen"',
}.items():
    body = body.replace(old, new)

head = source[:body_start]
head = re.sub(r"\s*<style>.*?</style>", "", head, flags=re.S)
head = head.replace('</head>', '    <link rel="stylesheet" href="src/css/styles.css">\n</head>')
html = head + body.replace('</body>', '    <script src="src/js/app.js"></script>\n</body>') + source[body_end:]
html = re.sub(r"\s*<script>.*?</script>", "", html, flags=re.S)
# The previous replacement intentionally adds app.js after the body; restore it if cleanup removed it.
if 'src/js/app.js' not in html:
    html = html.replace('</body>', '    <script src="src/js/app.js"></script>\n</body>')
index.write_text(html, encoding="utf-8")
print("Project split completed")
