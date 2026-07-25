"""Source configuration for ingestion.

Keys are each company's public board identifier on its ATS; values are display
names. Every board is verified live before inclusion. Coverage spans industries
(healthcare, hospitality, logistics, education, retail, finance, media, tech)
and includes African employers. Jooble queries target the Nigeria/local market
across professions, not only tech.
"""

GREENHOUSE_BOARDS: dict[str, str] = {
    # African employers
    "moniepoint": "Moniepoint",
    "jumia": "Jumia",
    # healthcare / education
    "oscar": "Oscar Health",
    "duolingo": "Duolingo",
    "guild": "Guild",
    # hospitality / food / retail / logistics
    "airbnb": "Airbnb",
    "sweetgreen": "Sweetgreen",
    "peloton": "Peloton",
    "instacart": "Instacart",
    "doordashusa": "DoorDash",
    "lyft": "Lyft",
    # finance / tech
    "stripe": "Stripe",
    "coinbase": "Coinbase",
    "gitlab": "GitLab",
    "canonical": "Canonical",
    "databricks": "Databricks",
    "mongodb": "MongoDB",
    "cloudflare": "Cloudflare",
    "reddit": "Reddit",
    "figma": "Figma",
    "twilio": "Twilio",
}

LEVER_COMPANIES: dict[str, str] = {
    "palantir": "Palantir",
    "spotify": "Spotify",
}

ASHBY_BOARDS: dict[str, str] = {
    "ramp": "Ramp",
    "linear": "Linear",
    "openai": "OpenAI",
    "notion": "Notion",
    "cursor": "Cursor",
    "replit": "Replit",
    "supabase": "Supabase",
}

# (keywords, location) pairs per Jooble feed host. Keys are feed-bound (see
# Settings.jooble_feeds): the US feed carries remote/global roles, the Nigeria
# feed carries local roles across professions.
JOOBLE_QUERIES: dict[str, list[tuple[str, str]]] = {
    "jooble.org": [
        ("remote software engineer", ""),
        ("remote customer support", ""),
        ("remote accountant", ""),
        ("remote data analyst", ""),
        ("remote virtual assistant", ""),
    ],
    "ng.jooble.org": [
        ("software engineer", "Lagos"),
        ("product manager", "Lagos"),
        ("data analyst", "Nigeria"),
        ("accountant", "Lagos"),
        ("nurse", "Nigeria"),
        ("sales representative", "Lagos"),
        ("customer service", "Lagos"),
        ("teacher", "Nigeria"),
        ("logistics", "Lagos"),
        ("administrative assistant", "Abuja"),
        ("engineer", "Port Harcourt"),
        ("banking", "Lagos"),
    ],
}
