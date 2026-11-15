---
paths:
  - "services/registry-service/**/*.py"
---

# Registry service rules

- Every request body is a Pydantic model. Never use a `dict` or loose parameters.
- Every numeric field has bounds (`gt=0`, `ge=0`, or a range like `lat` -90..90). No unbounded numbers.
- Every endpoint needs a test in `tests/`, including at least one invalid-input case.
