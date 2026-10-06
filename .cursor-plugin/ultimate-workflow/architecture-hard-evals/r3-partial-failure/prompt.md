---
name: r3-partial-failure
tags: [hard, distributed]
runs: 3
max_turns: 4
timeout_seconds: 180
allowed_tools: [Skill]
---

Is there any problem with this checkout flow? It works in testing.

```java
public Order checkout(Cart cart) {
    inventoryClient.reserve(cart.items());                              // HTTP call to inventory service
    PaymentResult r = paymentClient.charge(cart.total(), cart.card());  // HTTP call to payment service
    if (!r.ok()) { throw new PaymentFailed(); }
    return orderRepo.save(new Order(cart, r.id()));                     // local database
}
```
