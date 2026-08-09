## Prohibition of comments in principle

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
