## Keep task context out of documentation

Write README text, API documentation, and other user-facing explanations from the current reader's needs and the current behavior of the software. The reader does not share the agent's conversation, task instructions, discarded approaches, or knowledge of the previous implementation. Importing that context into documentation is a prohibited LLM writing pattern.

Removing an implementation does not make its absence a feature, guarantee, or explicit design choice. Do not document a removal by adding a statement that the software does not perform the removed operation. Do not preserve a disappearing implementation through implicit comparisons, restrictive qualifiers, or negative assurances. Describe what the software does.

For example, write "Setters consolidate aliases of the requested attribute." Do not write "Setters consolidate only aliases of the requested attribute" to contrast with a removed whole-element normalization step. Removing normalization does not justify adding "Attributes are not normalized." These examples define a reasoning error, not a blacklist of words: replacing "only" or rephrasing a negative statement while retaining the historical comparison still violates this rule.

Before adding or revising a sentence, ask whether a reader would need it if the previous implementation had never existed. If its purpose depends on the change request or the disappearing implementation, discard it. Do not relocate that explanation into another paragraph, an example, a footnote, or a code comment. Do not turn every implementation detail discussed during the task into a documented contract.

State a limitation or negative guarantee when it is independently required to understand or use the current API, and establish that need from the current API rather than from the editing history. Change history belongs in an explicitly requested migration guide or changelog, not in descriptions of current behavior.

Review documentation changes for these errors before finishing. This review must examine the reason for each statement, not merely remove particular words.
