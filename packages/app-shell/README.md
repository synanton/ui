# App shell foundation

This package provides the workbench layout, navigation filtering, auth-state boundary, error boundary, loading state, capability-aware visibility, and a tenant-context port with an explicit mock implementation.

The production tenant adapter is intentionally absent. Do not read tenant scope from localStorage or sessionStorage or treat a client-supplied tenant header as authority. Wire a real provider only after Platform issue #335 and ADR 0002 settle the tenant contract.

Capability filtering is a presentation convenience only. Every protected operation must still be authorized by Platform.
