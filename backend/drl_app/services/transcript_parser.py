from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from io import BytesIO
import re
import unicodedata

try:
    import pdfplumber
except ImportError:  # pragma: no cover - optional dependency
    pdfplumber = None

try:
    import fitz
except ImportError:  # pragma: no cover - optional dependency
    fitz = None


CLASS_CODE_PATTERN = re.compile(r"\b[A-Z]{1,6}\d{2,6}[A-Z0-9]{0,6}\b")
ROW_PATTERN = re.compile(
    r"^\s*(?:\d+\s+)?(?P<student_code>\d{4,20})\s+(?P<full_name>.+?)\s+(?P<gpa>\d+(?:[.,]\d+)?)\s*$"
)


@dataclass
class TranscriptRow:
    student_code: str
    full_name: str
    gpa: Decimal


@dataclass
class TranscriptParseResult:
    class_name: str
    rows: list[TranscriptRow]
    extracted_text: str


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text or "")
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", text).strip().lower()


def _to_decimal(value) -> Decimal | None:
    if value is None:
        return None
    text = str(value).strip().replace(",", ".")
    if not text:
        return None
    try:
        return Decimal(text)
    except (InvalidOperation, ValueError):
        match = re.search(r"\d+(?:[.,]\d+)?", text)
        if not match:
            return None
        try:
            return Decimal(match.group(0).replace(",", "."))
        except (InvalidOperation, ValueError):
            return None


def _extract_text_with_pdfplumber(file_bytes: bytes) -> tuple[str, list[list[list[str]]]]:
    if pdfplumber is None:
        return "", []

    texts = []
    tables = []
    try:
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                text = page.extract_text() or ""
                if text:
                    texts.append(text)
                try:
                    tables.extend(page.extract_tables() or [])
                except Exception:
                    continue
    except Exception:
        return "", []
    return "\n".join(texts), tables


def _extract_text_with_pymupdf(file_bytes: bytes) -> str:
    if fitz is None:
        return ""

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    parts = []
    for page in doc:
        text = page.get_text("text") or ""
        if text:
            parts.append(text)
    doc.close()
    return "\n".join(parts)


def _extract_class_name(text: str) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    normalized_lines = [(_normalize(line), line) for line in lines]

    explicit_patterns = [
        re.compile(r"(?:lop|class)(?: hoc)?\s*[:\-]?\s*([A-Z0-9_./-]+)", re.IGNORECASE),
        re.compile(r"(?:lop|class)\s*(?:hoc)?\s+([A-Z0-9_./-]+)", re.IGNORECASE),
    ]

    for normalized, original in normalized_lines:
        if "lop" in normalized or "class" in normalized:
            for pattern in explicit_patterns:
                match = pattern.search(original)
                if match:
                    candidate = match.group(1).strip().upper()
                    if CLASS_CODE_PATTERN.fullmatch(candidate):
                        return candidate

    for _, original in normalized_lines:
        matches = CLASS_CODE_PATTERN.findall(original.upper())
        if matches:
            return matches[0].strip().upper()

    return ""


def _clean_row_cells(row: list) -> list[str]:
    cleaned = []
    for cell in row:
        if cell is None:
            cleaned.append("")
        elif isinstance(cell, str):
            cleaned.append(cell.strip())
        else:
            cleaned.append(str(cell).strip())
    return cleaned


def _extract_from_tables(tables: list[list[list[str]]]) -> dict[str, TranscriptRow]:
    rows: dict[str, TranscriptRow] = {}

    for table in tables:
        if not table:
            continue

        normalized_rows = [_clean_row_cells(row) for row in table if any(cell for cell in row)]
        header_index = None
        code_index = None
        name_index = None
        gpa_index = None

        for idx, row in enumerate(normalized_rows):
            normalized = [_normalize(cell) for cell in row]
            if any("mssv" in cell or "student code" in cell or "student id" in cell or "ma sv" in cell for cell in normalized) and any(
                "tbctk" in cell or "gpa" in cell or "tb" in cell for cell in normalized
            ):
                header_index = idx
                for col_idx, cell in enumerate(normalized):
                    if code_index is None and ("mssv" in cell or "student code" in cell or "student id" in cell or "ma sv" in cell):
                        code_index = col_idx
                    if name_index is None and ("ho ten" in cell or "full name" in cell or "name" == cell):
                        name_index = col_idx
                    if gpa_index is None and ("tbctk" in cell or "gpa" in cell or "tb" == cell):
                        gpa_index = col_idx
                break

        if header_index is None or code_index is None or gpa_index is None:
            continue

        for row in normalized_rows[header_index + 1 :]:
            if len(row) <= max(code_index, gpa_index):
                continue
            student_code = row[code_index].strip()
            gpa = _to_decimal(row[gpa_index])
        if not student_code or gpa is None:
            continue

            full_name = row[name_index].strip() if name_index is not None and name_index < len(row) else ""
            rows[student_code] = TranscriptRow(
                student_code=student_code,
                full_name=full_name,
                gpa=gpa,
            )

    return rows


def _extract_from_lines(text: str, rows: dict[str, TranscriptRow]) -> None:
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if "mssv" in _normalize(line) or "tbctk" in _normalize(line):
            continue

        match = ROW_PATTERN.match(line)
        if not match:
            continue

        student_code = match.group("student_code").strip()
        full_name = match.group("full_name").strip()
        gpa = _to_decimal(match.group("gpa"))
        if not student_code or gpa is None:
            continue

        rows[student_code] = TranscriptRow(
            student_code=student_code,
            full_name=full_name,
            gpa=gpa,
        )


def parse_transcript_pdf(uploaded_file) -> TranscriptParseResult:
    if not uploaded_file:
        raise ValueError("No file was provided.")

    file_bytes = uploaded_file.read()
    uploaded_file.seek(0)

    text, tables = _extract_text_with_pdfplumber(file_bytes)
    if not text:
        text = _extract_text_with_pymupdf(file_bytes)

    class_name = _extract_class_name(text)
    if not class_name:
        raise ValueError("Khong xac dinh duoc lop hoc trong PDF.")

    rows = _extract_from_tables(tables)
    _extract_from_lines(text, rows)

    if not rows:
        raise ValueError("Khong tim thay dong du lieu MSSV/TBCTK trong PDF.")

    sorted_rows = sorted(rows.values(), key=lambda row: row.student_code)
    return TranscriptParseResult(
        class_name=class_name,
        rows=sorted_rows,
        extracted_text=text,
    )
