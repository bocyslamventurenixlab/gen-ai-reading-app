"""Pydantic data models for the API"""
from pydantic import BaseModel


class QueryRequest(BaseModel):
    document_id: int
    query: str
