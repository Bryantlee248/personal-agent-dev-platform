# GitHub delivery contract

The validator binds a pull request body to the actual GitHub event head SHA and merge-base diff. The `pull_request_target` workflow runs the validator from the trusted default-branch checkout, reads `PROJECT.json` from the trusted base SHA, fetches the PR commit only as Git data, and never checks out or executes PR code. Rename detection is disabled so both deleted and added paths remain visible to ownership checks.

The Verification session is an audit pointer, not a signature, and `Expected checks` is a fixed declaration rather than proof of their conclusions. The workflow reports a check result; branch protection can require it after this applicability repair is merged. Human approval remains mandatory, and this component never merges, releases, or deploys.

Architecture governance PRs are `not-applicable` only when `gov:role=architecture` and `gov:iwp` bind the PR to an ACTIVE trusted-base work package and every actual changed path is covered by that package's `Architecture AI` ownership. Mixed or unknown paths fail closed. Delivery PRs continue through the full fixed-SHA review contract.
