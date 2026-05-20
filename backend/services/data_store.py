from __future__ import annotations

from dataclasses import dataclass
from typing import Dict
from uuid import uuid4

import pandas as pd


@dataclass
class StoredDataset:
    filename: str
    dataframe: pd.DataFrame


DATASETS: Dict[str, StoredDataset] = {}


def save_dataset(filename: str, dataframe: pd.DataFrame) -> str:
    dataset_id = uuid4().hex
    DATASETS[dataset_id] = StoredDataset(filename=filename, dataframe=dataframe)
    return dataset_id


def get_dataset(dataset_id: str) -> StoredDataset:
    if dataset_id not in DATASETS:
        raise KeyError(f"Dataset '{dataset_id}' was not found. Please upload the data file again.")
    return DATASETS[dataset_id]
