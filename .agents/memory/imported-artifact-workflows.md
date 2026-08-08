---
name: Imported artifact workflows
description: Workflow ownership and port behavior after importing a Vercel project into the pnpm workspace
---

Artifact-owned services under `artifacts/<slug>/.replit-artifact/artifact.toml` are the reliable owners of their assigned ports and proxy paths. Imported projects may also leave manually configured or `.migration-backup` workflow entries behind; those entries can show failed states or compete for the same port even when the real artifact service is healthy.

**Why:** Duplicate workflows caused port conflicts and misleading failed status entries while the actual API and web services were responding correctly.

**How to apply:** Prefer the exact managed artifact workflow for verification and restart. Remove or reconcile stale non-artifact workflow entries through validated Replit configuration tooling rather than adding another manual workflow.