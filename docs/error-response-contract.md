# Error response contract

The global HTTP exception filter returns a `requestId` with every error and
sets the same value in the `X-Request-ID` response header. A valid incoming
`X-Request-ID` is preserved for tracing; invalid or missing values are replaced
with a generated UUID.

Database provider details are never returned to clients. Known Prisma errors
are mapped to stable public messages and codes, while unrecognized Prisma
failures use the generic `DB_ERROR` response. Query text, metadata, and raw
provider messages remain server-side only.
