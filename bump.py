#!/usr/bin/env python3
"""
Пересчитывает версии в адресах style.css и app.js по содержимому файлов.

Зачем: браузер кэширует style.css и app.js очень цепко и не перезапрашивает их
даже при новом адресе страницы. Из-за этого можно часами смотреть на смесь
нового HTML со старым CSS и чинить несуществующие баги.

Версия — это md5 от содержимого: изменили файл, запустили скрипт, адрес
изменился, браузер обязан скачать заново.

Запуск после каждой правки CSS или JS:

    python bump.py
"""

import hashlib
import io
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HTML = ROOT / "index.html"
ASSETS = {
    "style.css": r'href="style\.css(\?v=[^"]*)?"',
    "app.js": r'src="app\.js(\?v=[^"]*)?"',
}


def digest(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()[:8]


def main() -> int:
    if not HTML.exists():
        print("index.html не найден рядом со скриптом", file=sys.stderr)
        return 1

    html = io.open(HTML, encoding="utf-8").read()
    changed = []

    for name, pattern in ASSETS.items():
        asset = ROOT / name
        if not asset.exists():
            print(f"пропускаю {name}: файла нет", file=sys.stderr)
            continue
        version = digest(asset)
        attr = "href" if name.endswith(".css") else "src"
        replacement = f'{attr}="{name}?v={version}"'
        html, count = re.subn(pattern, replacement, html)
        if count:
            changed.append(f"{name} -> ?v={version}")
        else:
            print(f"пропускаю {name}: ссылка в index.html не найдена", file=sys.stderr)

    io.open(HTML, "w", encoding="utf-8", newline="").write(html)

    if changed:
        print("Обновлено:")
        for line in changed:
            print("  " + line)
    else:
        print("Нечего обновлять.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
