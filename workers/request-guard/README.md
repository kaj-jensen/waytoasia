# Internal request guard

Deploy `waytoasia-request-guard` using this configuration. Bind it as `REQUEST_GUARD` on the matching Cloudflare Pages project(s), preserving all existing bindings. The service has no public routes and uses the existing Workers rate-limit primitive. It has no database, email or third-party API access. Incoming keys are hashed before counting; limits are approximate per Cloudflare location, not a global quota.
