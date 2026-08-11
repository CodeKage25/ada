"""Resolve a listing to the ATS-hosted application form.

Employers often front their ATS with a custom careers site (openai.com/careers over
Ashby, stripe.com/jobs over Greenhouse). The hosted form still exists at a canonical URL
derivable from (source, board slug, external_id) — and automating against the hosted form
is the difference between filling a real form and staring at a marketing page. The slug
comes from the same registry ingestion fetched the job from, so it is always known for
first-party ATS listings.
"""
from ada.db.models import Job
from ada.ingest import boards


def _by_company(registry: dict[str, str]) -> dict[str, str]:
    return {company.lower(): slug for slug, company in registry.items()}

_GREENHOUSE = _by_company(boards.GREENHOUSE_BOARDS)
_LEVER = _by_company(boards.LEVER_COMPANIES)
_ASHBY = _by_company(boards.ASHBY_BOARDS)


def canonical_apply_url(job: Job) -> str | None:
    """The hosted application-form URL for a listing, or None when only the stored URL
    (or nothing) is usable. Hosted URLs pass through; custom-domain URLs are rebuilt from
    the ingestion registry; aggregator sources have no canonical form."""
    url = (job.url or "").rstrip("/")
    if job.source == "greenhouse":
        if "greenhouse.io" in url:
            return url
        slug = _GREENHOUSE.get(job.company.lower())
        return f"https://boards.greenhouse.io/{slug}/jobs/{job.external_id}" if slug else None
    if job.source == "lever":
        if "lever.co" in url:
            return url if url.endswith("/apply") else f"{url}/apply"
        slug = _LEVER.get(job.company.lower())
        return f"https://jobs.lever.co/{slug}/{job.external_id}/apply" if slug else None
    if job.source == "ashby":
        if "ashbyhq.com" in url:
            return url if url.endswith("/application") else f"{url}/application"
        slug = _ASHBY.get(job.company.lower())
        return f"https://jobs.ashbyhq.com/{slug}/{job.external_id}/application" if slug else None
    return None
