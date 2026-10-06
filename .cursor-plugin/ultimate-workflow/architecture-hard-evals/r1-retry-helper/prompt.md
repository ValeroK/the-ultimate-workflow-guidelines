---
name: r1-retry-helper
tags: [hard, distributed]
runs: 3
max_turns: 4
timeout_seconds: 180
allowed_tools: [Skill]
---

Can you review this retry helper before I merge? It wraps our payment calls.

```typescript
async function retry<T>(fn: () => Promise<T>, attempts = 5, delayMs = 1000): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e) { await sleep(delayMs); }
  }
  throw new Error('failed');
}

// HttpClient.post already wraps its own call in retry(...)
class PaymentClient {
  charge(orderId: string, cents: number) {
    return retry(() => this.http.post('/v1/charges', { orderId, cents }));
  }
}
// OrderService.checkout() also wraps paymentClient.charge(...) in retry(..., 3)
```
