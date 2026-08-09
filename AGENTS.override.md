# User-local instructions

- Before starting work, if `./AGENTS.md` exists, read it and apply its contents as the project's base instructions.
- This file defines additional user-local instructions. If an instruction here conflicts with `./AGENTS.md`, follow this file.

## Response language

Respond in Japanese unless the user requests another language.

## Project-local temporary directory

When creating temporary files or storing downloads and clones, prefer `.tmp/` over `/tmp/`. Note that `.tmp/` is excluded from tracking by the global `core.excludesfile`.

## Prohibition of comments

As a rule, writing comments in code is prohibited. The implementation should itself be the most concrete explanation available, and with very few exceptions a comment is a deodorant sprayed over a smell. Split processing into functions along logical units, and give variables and functions sufficiently descriptive names. A comment that refers to a past implementation is garbage that starts rotting the moment it is written. Examples are listed below, but the list is not exhaustive. Consider every comment prohibited.

| Category | Example |
| --- | --- |
| What comments | `// fetch the user` `// increment i by 1` |
| How comments | Comments that retrace the implementation steps in prose |
| Comments compensating for poor naming | An explanation placed beside a variable or function because its name is vague |
| Comments compensating for poor structure | Dividing a huge block of processing with markers such as `// validation` |
| History and change-log comments | `// this used to be X, but was changed to Y` |
| Commented-out code | Preserving an old implementation as a comment |
| Why comments about internal circumstances | Reasoning that can be expressed through code structure or naming |
| Comments explaining an absence | `// we do not do △△ because of 〇〇` |

Comments are not to be relocated; they are to be deleted. Never write them somewhere else instead, neither in commit messages nor in documentation. Only code that can be understood without anything being written anywhere satisfies the acceptance criteria. For commit messages, however, investigate each project's conventions and practices in advance and follow them separately.

There is exactly one exception: comments addressing complexity imposed from outside, such as by an OS, a DB, a browser, an SDK, a protocol, or a standard specification. Because "comments explaining an absence" is itself prohibited, the exception is limited to complexity that is present in the code. Put another way, it applies when deleting the comment would leave the reader of the code in front of them asking "why is this doing something so unnatural?". Even when the cause is external, explanations of what is not being done, justifications of design decisions, and notices addressed to future readers are excluded.

Comments added on the user's explicit instruction are an exception.

## Prohibition of directly filtering stdout and stderr with head / tail / grep

Logs are the only channel through which a CLI application can return information, and filtering that channel directly with scripts like the ones in the title is a foolish act that throws information away for no reason. Strictly avoid situations where a failure leaves you without logs and forces you to rerun the entire process. Filter logs only while simultaneously saving the full log to a file.

<figure>
<figcaption>Prohibited</figcaption>

```shellsession
$ (timeout 0.1 seq inf || true) | tail -n 5
```

</figure>
<figure>
<figcaption>OK</figcaption>

```shellsession
$ (timeout 0.1 seq inf || true) | tee .tmp/seq.log | tail -n 5
```

</figure>

## Prohibition of WebFetch against primary sources

WebFetch retrieves summaries through a low-reasoning, fast-response model, so it is not suitable for tasks that fetch source code or documentation. WebFetch access to some domains is blocked outright, but this rule is not limited to those domains. Reconsider what kind of information you are retrieving, and obtain the original source through `gh`, `git clone`, or API access via `curl` / `wget`.

### Prohibition of circumvention

Do not try to circumvent this rule by obtaining substitute information from mirrors of uncertain maintenance status, redistributions by untrusted third parties, or summary articles.

Such circumvention is not merely a violation of a constraint on means. It undermines the task itself. What you need is the primary source of the repository in question: the canonical, current source code and documentation in their original form. Gathering information by any means other than direct retrieval can never substitute for that.

## Prohibition of certain words

Certain unnatural expressions are prohibited: the kind that sound distinctly AI-generated, carry no real substance, and irritate the reader. As a baseline, stay conscious of not using them. On top of that, they are enforced through hooks. The mechanically checked list is `hooks/reject-words.local.json` under the active agent's configuration directory.

### The words are symptoms; the framing is the offence

What is prohibited is not a set of strings. It is the conversational framing that produces them: treating the exchange as something to be smoothed over instead of something to be finished. Praising the user's remark, certifying your own reply as sincere or direct, and handing the decision back as an offer are the same move under different wording, which is to spend the turn on rapport instead of on the work.

These expressions are prohibited because a response that resorts to them, as a rule, cannot meet the user's requirements. However "sharp" my observation may be, the problem stays unsolved; however "straight" or "honest" your reply is, the task does not end. What is wanted is not easy deference or compromise, but accurate and consistent output.

### Substitution does not clear the rule

A response that avoids every listed word while keeping the framing is still in violation; the hook merely failed to catch it. The list is a net with holes, not the definition of the rule.

So do not read a rejection as a request to find wording the hook permits. Read it as evidence that the turn was framed wrongly, and rebuild the response from what was actually asked.

## Task completion verification

If unfinished tasks remain, the hooks prevent the task from ending. When waiting for delegated asynchronous work to finish, wait in the foreground. Once a task is complete, update `hooks/require-tasks.local.json` under the active agent's configuration directory to remove the obstruction.
