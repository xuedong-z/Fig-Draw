from fastapi import APIRouter, File, HTTPException, UploadFile
import pandas as pd

from models.schemas import TableDatasetRequest
from services.data_parser import parse_uploaded_file
from services.data_store import save_dataset

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("")
async def upload_data(file: UploadFile = File(...)):
    try:
        content = await file.read()
        df, extension = parse_uploaded_file(file.filename or "uploaded-data", content)
        dataset_id = save_dataset(file.filename or "uploaded-data", df)
        return {
            "dataset_id": dataset_id,
            "filename": file.filename,
            "extension": extension,
            "columns": list(df.columns),
            "preview": df.head(8).where(df.notna(), None).to_dict(orient="records"),
            "rows": df.where(df.notna(), None).to_dict(orient="records"),
            "row_count": int(len(df)),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/table")
def upload_table_data(request: TableDatasetRequest):
    try:
        if not request.rows:
            raise ValueError("Edited data table is empty. Please import or add data before generating a figure.")
        df = pd.DataFrame(request.rows)
        if df.empty:
            raise ValueError("Edited data table is empty. Please import or add data before generating a figure.")
        df = df.replace("", pd.NA).dropna(how="all")
        if df.empty:
            raise ValueError("Edited data table only contains empty rows.")
        df.columns = [str(column).strip() for column in df.columns]
        if any(column == "" for column in df.columns):
            raise ValueError("One or more columns have empty names. Please check the editable table.")
        dataset_id = save_dataset(request.filename or "edited-table.csv", df)
        return {
            "dataset_id": dataset_id,
            "filename": request.filename or "edited-table.csv",
            "extension": ".table",
            "columns": list(df.columns),
            "preview": df.head(8).where(df.notna(), None).to_dict(orient="records"),
            "rows": df.where(df.notna(), None).to_dict(orient="records"),
            "row_count": int(len(df)),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
