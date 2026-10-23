## Project-local temporary directory

When creating temporary files or storing downloads and clones for investigation, prefer `.tmp/` over `/tmp/`. Note that `.tmp/` is excluded from tracking by the global `core.excludesfile`.

`.tmp/` holds temporary files, just as `/tmp/` does. Do not impose on the user the inconvenience of inspecting the inside of `.tmp/`. Take deliverables for the user out of `.tmp/` and present them appropriately.
