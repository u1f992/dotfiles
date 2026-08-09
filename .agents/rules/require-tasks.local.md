## Task completion verification

If unfinished tasks remain, the hooks prevent the task from ending. When waiting for delegated asynchronous work to finish, wait in the foreground. Once a task is complete, update `hooks/require-tasks.local.json` under the active agent's configuration directory to remove the obstruction.
