#!/usr/bin/env python3
"""Combine the rendered manual PDFs and add chapter-aware page footers."""

from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parent
COVER = ROOT / "tmp/pdfs/generated/cover.pdf"
CHAPTERS = ROOT / "tmp/pdfs/generated/chapters.pdf"
OUTPUT = ROOT / "output/pdf/ルービックキューブ_マニュアル.pdf"


def chapter_name(text: str) -> str:
    compact = text.replace(" ", "").upper()
    if "回転記" in compact:
        return "SYMBOLS"
    if "F2L" in compact:
        return "F2L"
    if "OLL" in compact:
        return "OLL"
    if "PLL" in compact:
        return "PLL"
    return "CHAPTER"


def footer_overlay(width: float, height: float, label: str, number: int):
    stream = BytesIO()
    pdf = canvas.Canvas(stream, pagesize=(width, height))
    pdf.setStrokeColorRGB(0.72, 0.72, 0.72)
    pdf.setLineWidth(0.45)
    pdf.line(40, 28, width - 40, 28)
    pdf.setFillColorRGB(0.35, 0.36, 0.39)
    pdf.setFont("Helvetica-Bold", 7)
    pdf.drawString(40, 17, f"CUBE MANUAL  /  {label}")
    pdf.setFont("Helvetica", 8)
    pdf.drawRightString(width - 40, 17, f"{number:02d}")
    pdf.save()
    stream.seek(0)
    return PdfReader(stream).pages[0]


def main() -> None:
    if not COVER.exists() or not CHAPTERS.exists():
        raise SystemExit("Render cover.pdf and chapters.pdf before building the manual.")

    cover = PdfReader(COVER)
    chapters = PdfReader(CHAPTERS)
    writer = PdfWriter()

    for page in cover.pages:
        writer.add_page(page)

    current_label = "SYMBOLS"
    chapter_offsets = []
    for index, page in enumerate(chapters.pages, start=1):
        text = page.extract_text() or ""
        if "CUBEMANUAL" in text.replace(" ", "").upper():
            current_label = chapter_name(text)
            chapter_offsets.append((current_label, len(writer.pages)))

        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        page.merge_page(footer_overlay(width, height, current_label, index))
        writer.add_page(page)

    writer.add_metadata(
        {
            "/Title": "ルービックキューブ マニュアル",
            "/Author": "植松香介",
            "/Subject": "回転記号・F2L・OLL・PLL",
            "/Keywords": "Rubik's Cube, F2L, OLL, PLL",
        }
    )
    writer.add_outline_item("表紙", 0)
    writer.add_outline_item("目次", 1)
    for label, offset in chapter_offsets:
        writer.add_outline_item(label, offset)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("wb") as handle:
        writer.write(handle)

    print(f"Wrote {len(writer.pages)} pages to {OUTPUT}")


if __name__ == "__main__":
    main()
