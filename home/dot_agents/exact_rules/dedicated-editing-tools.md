## Use dedicated editing tools for ordinary file edits

Use the dedicated editing tool for ordinary file creation and modification. Use `apply_patch` when it is available; otherwise use the agent's dedicated file editing tools. Replacing ordinary edits with Shell commands or Python scripts is explicitly prohibited by the user. Do not routinely reimplement path handling, file reads, text replacement, matching checks, and file writes when a patch expresses the intended change directly.

Patch context matching and failure are an explicit safety harness. A failed patch signals that the actual file may differ from the assumed starting state. Inspect the file, resolve the mismatch, and revise the patch. Do not switch to Shell, Python, or another writing mechanism to force the same edit through or bypass an editing hook.

Automated transformations using sed, awk, Python, or similar tools are appropriate when the transformation itself has a clear advantage, such as a substantial uniform replacement or a structured conversion. The justification must come from the work being automated, not from convenience, habit, a patch failure, or a desire to avoid inspection. Such transformations must still satisfy applicable hook checks; automation does not authorize bypassing them.
