# Free source security checks

Gitleaks scans full fetched Git history and redacts secret values. Semgrep uses a small, reviewable local ruleset for dangerous code execution, disabled TLS validation and shell interpolation. Neither scanner uploads source to a hosted scanning service. The workflow runs on pull requests or manually, within existing GitHub Actions allowances; it does not purchase a service. These checks complement Dependabot and existing code scanning and are not exhaustive.

If a secret is found, rotate it before treating a historical removal or scanner exception as a fix. Never print the original value in logs, issues or pull requests.
