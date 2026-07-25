"""Job ingestion: fetch real listings from ATS APIs, normalize, embed, upsert.

Runs as a scheduled CLI (`python -m ada.ingest`) — never in a request handler.
Matching only ever reads the local `jobs` table.
"""
