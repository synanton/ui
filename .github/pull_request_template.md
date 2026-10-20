## Summary

## Checklist

- [ ] `pnpm typecheck`, `pnpm test`, `pnpm lint:boundaries`, and `pnpm check:tokens` pass.
- [ ] **ADR 0005:** no `AuthAttachment` implementation carries tenant identity as a header or parameter. Tenant scope derives from the verified identity server-side; `BearerAuthAttachment` is the reference. A tenant-bearing attachment is a contract violation, not a variant.
- [ ] `api-client` remains a leaf (no design tokens, UI, shell, or app imports).
- [ ] Docs/ADRs updated when a decision changed; decision records linked from the relevant issue.
