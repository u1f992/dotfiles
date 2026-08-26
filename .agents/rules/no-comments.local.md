## Prohibition of writing comments

This rule governs the writing of comments. It is not a mandate to clean up comments already present in the codebase and does not expand the scope of the user's request. Leave existing comments unchanged unless changing them is part of the requested work. When moving code, preserve the comments that accompany it rather than treating the move as authorization to delete them.

As a rule, writing comments in code is prohibited. The implementation should itself be the most concrete explanation available, and with very few exceptions a comment is a deodorant sprayed over a smell. A comment that refers to a past implementation is garbage that starts rotting the moment it is written. Examples are listed below, but the list is not exhaustive. Consider every newly proposed comment prohibited before deciding how the reader should receive the information. This presumption is the starting condition for that decision, not a metric applied to the finished code.

Use the prohibition as a harness on the direction of reasoning. Before adding an explanatory identifier, abstraction, type, or comment, determine what a maintainer can reasonably infer from the language, the local code, established project conventions, and the domain, then determine what remains unavailable from those sources. Add only the information needed to bridge that gap. Where code can carry the missing information, use logical structure and sufficiently descriptive names. Self-explanatory code is calibrated to shared context; it is not code that states everything.

Self-explanatory code does not mean maximally decomposed code. Extract a function when it forms a logical unit and its boundary or name reduces the work required to understand the program. A difficult block used at a single site may be clearer at that site because its locality itself records that the difficulty belongs only there. Do not split a one-off block into many functions merely to avoid a comment or shorten the caller. Account for the navigation, parameters, return values, and state tracking introduced by extraction, as well as the false suggestion that the extracted code is reusable or independently meaningful. Do not respond to the prohibition by expanding the code until it narrates every inference. Maintenance effort and reader attention are finite resources rather than free inputs.

The intended causal direction is that sufficiently understandable structure makes comments unnecessary, so well-structured code will often contain few comments as a result. Do not reverse that inference: few comments do not prove that the structure is understandable. The absence of comments is not an acceptance criterion by itself. Do not decline, omit, or leave a requested implementation incomplete merely to avoid writing a comment, and do not leave obscure code unexplained merely because comments are prohibited by default.

First make only the structural improvements needed for the code to explain itself. If those improvements are impossible or insufficient and the remaining choice is between obscure code without an explanation and the same code with a comment, write the comment. In that situation, the comment is the least bad available implementation, not a relaxation of the default rule.

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

When a prospective comment is rejected because the code can carry the explanation, discard it instead of relocating its content to a commit message or documentation. This instruction applies only to content being considered for addition. It does not authorize deleting, moving, or rewriting existing comments, commit messages, or documentation. For commit messages, investigate each project's conventions and practices in advance and follow them separately.

Comments addressing complexity imposed from outside, such as by an OS, a DB, a browser, an SDK, a protocol, or a standard specification, are permitted. Because "comments explaining an absence" is itself prohibited, this exception is limited to complexity that is present in the code. Put another way, it applies when deleting the comment would leave the reader of the code in front of them asking "why is this doing something so unnatural?". Even when the cause is external, explanations of what is not being done, justifications of design decisions, and notices addressed to future readers are excluded.

Comments added on the user's explicit instruction are an exception. Once added, such a comment remains part of the user's requirements and must not be removed unless the user explicitly requests its removal.
