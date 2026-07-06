import os
import re
from dataclasses import dataclass


TIME_SRT_PATTERN = re.compile(r"^(\d{2}):(\d{2}):(\d{2}),(\d{3})$")
TIME_FLEX_PATTERN = re.compile(r"^(\d{2}):(\d{2}):(\d{2})(?:[,.](\d{1,3}))?$")
SRT_BLOCK_PATTERN = re.compile(
    r"^\s*(\d+)\s*\n"
    r"(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})[^\n]*\n"
    r"(.+?)\s*$",
    re.MULTILINE | re.DOTALL,
)


@dataclass
class Subtitle:
    index: int
    start_ms: int
    end_ms: int
    text: str


def srt_time_to_ms(time_str: str) -> int:
    """
    Convierte HH:MM:SS,mmm a milisegundos.
    """
    match = TIME_SRT_PATTERN.match(time_str.strip())
    if not match:
        raise ValueError(f"Formato de tiempo SRT inválido: {time_str}")
    hours, minutes, seconds, millis = map(int, match.groups())
    return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis


def parse_user_time_to_ms(time_str: str) -> int:
    """
    Acepta tiempos de usuario en formatos:
    - HH:MM:SS,mmm (SRT)
    - HH:MM:SS.mmm
    - HH:MM:SS.xx  (centésimas, típico de DaVinci)
    - HH:MM:SS     (sin fracción)
    """
    raw = strip_wrapping_quotes(time_str.strip())
    match = TIME_FLEX_PATTERN.match(raw)
    if not match:
        raise ValueError(
            f"Formato inválido: {time_str}. Usa HH:MM:SS,mmm o HH:MM:SS.xx"
        )

    hours_str, minutes_str, seconds_str, frac_str = match.groups()
    hours = int(hours_str)
    minutes = int(minutes_str)
    seconds = int(seconds_str)

    if minutes >= 60 or seconds >= 60:
        raise ValueError(f"Tiempo fuera de rango: {time_str}")

    millis = 0
    if frac_str:
        if len(frac_str) == 1:
            millis = int(frac_str) * 100
        elif len(frac_str) == 2:
            millis = int(frac_str) * 10
        else:
            millis = int(frac_str)

    return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis


def ms_to_lrc_tag(ms: int) -> str:
    """
    Convierte milisegundos a etiqueta LRC [mm:ss.xx] (centésimas).
    """
    safe_ms = max(0, ms)
    total_centiseconds = int(round(safe_ms / 10.0))
    total_seconds, centiseconds = divmod(total_centiseconds, 100)
    minutes, seconds = divmod(total_seconds, 60)
    return f"[{minutes:02d}:{seconds:02d}.{centiseconds:02d}]"


def parse_srt(content: str) -> list[Subtitle]:
    """
    Parseo básico de un SRT sin librerías externas.
    """
    normalized = content.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not normalized:
        return []

    subtitles: list[Subtitle] = []
    for block in re.split(r"\n\s*\n", normalized):
        block = block.strip()
        match = SRT_BLOCK_PATTERN.match(block)
        if not match:
            continue

        index_str, start_str, end_str, text_block = match.groups()
        text_one_line = " ".join(line.strip() for line in text_block.splitlines() if line.strip())
        if not text_one_line:
            continue

        start_ms = srt_time_to_ms(start_str)
        end_ms = srt_time_to_ms(end_str)
        subtitles.append(
            Subtitle(
                index=int(index_str),
                start_ms=start_ms,
                end_ms=end_ms,
                text=text_one_line,
            )
        )
    return subtitles


def filter_and_resync(subtitles: list[Subtitle], start_cut_ms: int, end_cut_ms: int) -> list[tuple[int, str]]:
    """
    Filtra subtítulos dentro del rango (incluyendo solapados) y resincroniza.
    """
    output: list[tuple[int, str]] = []
    for sub in subtitles:
        if sub.end_ms < start_cut_ms or sub.start_ms > end_cut_ms:
            continue

        synced_start = max(sub.start_ms, start_cut_ms) - start_cut_ms
        synced_start = max(0, synced_start)
        output.append((synced_start, sub.text))

    output.sort(key=lambda item: item[0])
    return output


def ensure_lrc_filename(name: str) -> str:
    normalized = normalize_input_path(name)
    if not normalized:
        return "salida_recortada.lrc"

    normalized = normalized.strip()
    stem, ext = os.path.splitext(normalized)

    if ext.lower() == ".lrc":
        return normalized

    if stem:
        return f"{stem}.lrc"

    return "salida_recortada.lrc"


def strip_wrapping_quotes(value: str) -> str:
    """
    Elimina comillas envolventes simples o dobles.
    Ej: "'C:\\ruta\\archivo.srt'" -> "C:\\ruta\\archivo.srt"
    """
    cleaned = value.strip()
    if len(cleaned) >= 2 and cleaned[0] == cleaned[-1] and cleaned[0] in ("'", '"'):
        return cleaned[1:-1].strip()
    # Tolera casos de pegado incompleto: solo comilla al inicio o al final.
    if cleaned.startswith(("'", '"')):
        cleaned = cleaned[1:].strip()
    if cleaned.endswith(("'", '"')):
        cleaned = cleaned[:-1].strip()
    return cleaned


def normalize_input_path(value: str) -> str:
    """
    Normaliza rutas pegadas desde PowerShell, por ejemplo:
    - & 'C:\\ruta\\archivo.srt'
    - & "C:\\ruta\\archivo.srt"
    - 'C:\\ruta\\archivo.srt'
    """
    cleaned = value.strip()
    if cleaned.startswith("&"):
        cleaned = cleaned[1:].strip()
    return strip_wrapping_quotes(cleaned)


def main() -> None:
    print("=== Conversor SRT -> LRC con recorte ===")

    archivo_srt = input('Archivo SRT (ej: "ACTO 1 COMPLETO.srt"): ').strip()
    archivo_srt = normalize_input_path(archivo_srt)
    if not archivo_srt:
        print("Error: Debes indicar un archivo SRT.")
        return

    inicio_recorte = input("Inicio recorte (HH:MM:SS,mmm o HH:MM:SS.xx): ").strip()
    final_recorte = input("Final recorte (HH:MM:SS,mmm o HH:MM:SS.xx): ").strip()

    try:
        start_cut_ms = parse_user_time_to_ms(inicio_recorte)
        end_cut_ms = parse_user_time_to_ms(final_recorte)
    except ValueError as exc:
        print(f"Error de formato de tiempo: {exc}")
        return

    if end_cut_ms <= start_cut_ms:
        print("Error: El final_recorte debe ser mayor que inicio_recorte.")
        return

    if not os.path.exists(archivo_srt):
        print(f'Error: No existe el archivo "{archivo_srt}".')
        return

    try:
        with open(archivo_srt, "r", encoding="utf-8-sig") as f:
            content = f.read()
    except OSError as exc:
        print(f"Error al leer el archivo: {exc}")
        return

    subtitles = parse_srt(content)
    if not subtitles:
        print("No se encontraron subtítulos válidos en el archivo SRT.")
        return

    lrc_items = filter_and_resync(subtitles, start_cut_ms, end_cut_ms)
    if not lrc_items:
        print("No hay subtítulos en el rango indicado.")
        return

    nombre_salida = input("Nombre de archivo de salida (.lrc): ")
    output_file = ensure_lrc_filename(nombre_salida)

    lines = [f"{ms_to_lrc_tag(ms)}{text}" for ms, text in lrc_items]
    data = "\n".join(lines) + "\n"

    try:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(data)
    except OSError as exc:
        print(f"Error al escribir el archivo LRC: {exc}")
        return

    print(f'Archivo LRC generado: "{output_file}"')
    print(f"Subtítulos exportados: {len(lines)}")


if __name__ == "__main__":
    main()
