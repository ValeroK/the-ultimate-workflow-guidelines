---
name: o3-logging-handler
tags: [hard, operability]
runs: 3
max_turns: 4
timeout_seconds: 180
allowed_tools: [Skill]
---

Please add structured logging and a request counter to this handler.

```python
def handle_payment(request):
    user = auth(request)
    result = gateway.charge(request.json)
    REQUESTS.labels(user_id=user.id, path=request.path).inc()
    return result
```
