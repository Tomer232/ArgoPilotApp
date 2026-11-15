---
paths:
  - "services/registry-service/**/*.py"
---

# Registry service rules

- Every request body is a Pydantic model. Never use a `dict` or loose parameters.
- Every new numeric field has a realistic minimum **and** maximum (like `lat` -90..90). `gt=0` alone is not enough: huge inputs can overflow to infinity (sent as `null`), tiny ones can multiply to 0.
- Every endpoint needs a test in `tests/`, including at least one invalid-input case.
