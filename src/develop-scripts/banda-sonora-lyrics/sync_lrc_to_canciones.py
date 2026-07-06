import argparse
import os
import re
import sys
from pathlib import Path


ARCHIVO_RE = re.compile(r'archivo:\s*"([^"]+)"')
LETRA_RE = re.compile(r"letra:\s*\[", re.MULTILINE)
HTML_TAG_RE = re.compile(r"<[^>]+>")


def find_matching_bracket(text: str, open_idx: int) -> int:
    """
    Encuentra el cierre ] correspondiente a un [ teniendo en cuenta strings.
    """
    depth = 0
    in_string = False
    escape = False
    quote_char = ""

    for i in range(open_idx, len(text)):
        ch = text[i]

        if in_string:
            if escape:
                escape = False
                continue
            if ch == "\\":
                escape = True
                continue
            if ch == quote_char:
                in_string = False
                quote_char = ""
            continue

        if ch in ('"', "'"):
            in_string = True
            quote_char = ch
            continue

        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return i

    raise ValueError("No se encontró cierre de corchete para letra: [ ... ]")


def escape_ts_string(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def load_lrc_lines(path: Path, strip_html: bool) -> list[str]:
    raw = path.read_text(encoding="utf-8-sig")
    out: list[str] = []
    for line in raw.splitlines():
        cleaned = line.strip()
        if strip_html:
            cleaned = HTML_TAG_RE.sub("", cleaned)
        if cleaned == "":
            # Conserva separación de estrofas si hubiera líneas vacías.
            out.append("")
        else:
            out.append(cleaned)
    return out


def build_letra_block(lines: list[str], indent_base: str = "    ") -> str:
    indent_item = indent_base + "  "
    if not lines:
        return "[]"

    body = []
    for line in lines:
        body.append(f'{indent_item}"{escape_ts_string(line)}",')
    return "[\n" + "\n".join(body) + f"\n{indent_base}]"


def update_canciones(canciones_path: Path, audios_dir: Path, strip_html: bool) -> tuple[int, int]:
    content = canciones_path.read_text(encoding="utf-8")
    cursor = 0
    updates = 0
    found = 0

    while True:
        m_archivo = ARCHIVO_RE.search(content, cursor)
        if not m_archivo:
            break

        found += 1
        archivo_public = m_archivo.group(1)  # /audios/A1 - 01 OBERTURA.wav
        audio_name = Path(archivo_public).name
        stem = Path(audio_name).stem
        lrc_path = audios_dir / f"{stem}.lrc"

        # Límite del objeto de canción actual (hasta el siguiente "  },").
        obj_end = content.find("\n  },", m_archivo.end())
        if obj_end == -1:
            obj_end = content.find("\n];", m_archivo.end())
            if obj_end == -1:
                raise ValueError("No se pudo determinar el final de un objeto de canción.")

        if not lrc_path.exists():
            cursor = obj_end + 1
            continue

        m_letra = LETRA_RE.search(content, m_archivo.end(), obj_end)
        if not m_letra:
            cursor = obj_end + 1
            continue

        bracket_open = content.find("[", m_letra.start())
        bracket_close = find_matching_bracket(content, bracket_open)
        if bracket_close > obj_end:
            cursor = obj_end + 1
            continue

        lrc_lines = load_lrc_lines(lrc_path, strip_html=strip_html)
        new_letra = build_letra_block(lrc_lines, indent_base="    ")

        content = content[:bracket_open] + new_letra + content[bracket_close + 1 :]
        updates += 1

        cursor = bracket_open + len(new_letra)

    canciones_path.write_text(content, encoding="utf-8")
    return found, updates


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sincroniza letras LRC en src/data/canciones.ts"
    )
    parser.add_argument(
        "--canciones",
        default="src/data/canciones.ts",
        help='Ruta a canciones.ts (default: "src/data/canciones.ts")',
    )
    parser.add_argument(
        "--audios-dir",
        default="public/audios",
        help='Directorio de LRC (default: "public/audios")',
    )
    parser.add_argument(
        "--keep-html",
        action="store_true",
        help="No eliminar etiquetas HTML de las líneas LRC.",
    )
    args = parser.parse_args()

    canciones_path = Path(args.canciones)
    audios_dir = Path(args.audios_dir)

    if not canciones_path.exists():
        print(f'Error: No existe "{canciones_path}".')
        sys.exit(1)
    if not audios_dir.exists():
        print(f'Error: No existe "{audios_dir}".')
        sys.exit(1)

    try:
        found, updates = update_canciones(
            canciones_path=canciones_path,
            audios_dir=audios_dir,
            strip_html=not args.keep_html,
        )
    except Exception as exc:
        print(f"Error al actualizar canciones: {exc}")
        sys.exit(1)

    print(f"Canciones revisadas: {found}")
    print(f"Canciones actualizadas con LRC: {updates}")
    print(f'Archivo actualizado: "{canciones_path}"')


if __name__ == "__main__":
    main()
