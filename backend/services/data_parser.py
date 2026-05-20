from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Tuple

import pandas as pd


SUPPORTED_EXTENSIONS = {".csv", ".txt", ".xlsx", ".xls"}


def parse_uploaded_file(filename: str, content: bytes) -> Tuple[pd.DataFrame, str]:
    extension = Path(filename).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise ValueError("Unsupported file format. Please upload CSV, TXT, XLS, or XLSX.")

    if not content:
        raise ValueError("Uploaded file is empty.")

    try:
        if extension == ".csv":
            df = pd.read_csv(BytesIO(content))
        elif extension == ".txt":
            df = pd.read_csv(BytesIO(content), sep=None, engine="python")
        else:
            df = pd.read_excel(BytesIO(content), engine="openpyxl")
    except Exception as exc:
        if extension in {".xlsx", ".xls"}:
            raise ValueError(f"Excel file could not be read: {exc}") from exc
        raise ValueError(f"Data file could not be read: {exc}") from exc

    if df.empty:
        raise ValueError("Parsed data is empty. Please check the file contents.")

    df = df.dropna(how="all")
    df.columns = [str(col).strip() for col in df.columns]
    if any(col == "" for col in df.columns):
        raise ValueError("One or more columns have empty names. Please add headers to the data file.")

    return df, extension
