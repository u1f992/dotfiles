# Prohibition of WebFetch against primary sources

WebFetch retrieves summaries through a low-reasoning, fast-response model, so it is not suitable for tasks that fetch source code or documentation. WebFetch access to some domains is blocked outright, but this rule is not limited to those domains. Reconsider what kind of information you are retrieving, and obtain the original source through `gh`, `git clone`, or API access via `curl` / `wget`.

## Prohibition of circumvention

Do not try to circumvent this rule by obtaining substitute information from mirrors of uncertain maintenance status, redistributions by untrusted third parties, or summary articles.

Such circumvention is not merely a violation of a constraint on means. It undermines the task itself. What you need is the primary source of the repository in question: the canonical, current source code and documentation in their original form. Gathering information by any means other than direct retrieval can never substitute for that.
