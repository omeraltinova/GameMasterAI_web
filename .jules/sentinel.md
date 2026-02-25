# Sentinel's Journal

## 2024-03-22 - [Missing Rate Limits on AI Endpoints]
**Vulnerability:** Critical AI endpoints (narrate, generate-location-image) had no rate limiting, exposing the application to financial exhaustion and DoS.
**Learning:** Next.js API routes are serverless, making shared state rate limiting tricky without external stores like Redis. In-memory limiting provides per-instance protection but isn't a global solution.
**Prevention:** Always implement rate limiting on expensive or resource-intensive endpoints, even if simple in-memory limiting is the only option available initially.
