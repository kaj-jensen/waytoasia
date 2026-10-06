# Dependency checks

The dependency-security workflow runs on pushes, pull requests and weekly. It installs locked dependencies without lifecycle scripts, uses a read-only token, and audits production dependencies without exceptions.

The full tooling audit reports three exact advisories as visible warnings because current extract-zip 2.0.1 and sprintf-js 1.1.3 have no patched releases: GHSA-jmr9-qjv8-65gv, GHSA-7pqw-9j4j-h8q3 and GHSA-hp3w-g68c-fv3c. These packages belong to Lighthouse development tooling. All other findings fail the check. The weekly security review checks patch availability. Remove these exceptions after supported patched releases are installed.
