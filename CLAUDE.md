# CLAUDE.md

## URL patterns

Articles live under two routes depending on publish state:

- **Published:** `/articles/[id]` — e.g. `/articles/frontend-framework-saas`
- **Draft:** `/drafts/[id]` — e.g. `/drafts/frontend-framework-saas`

The `[id]` matches the filename of the `.mdx` file in `src/data/articles/`.
Drafts are accessible by direct link only; they do not appear in the public articles listing.
