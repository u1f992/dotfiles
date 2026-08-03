export type HookAdapter<Decision, StopDecision extends Decision> = {
  allow: () => Decision;
  warn: (message: string) => Decision;
  stop: {
    matches: (input: unknown) => boolean;
    message: (input: unknown) => string | undefined;
    allow: () => StopDecision;
    warn: (message: string) => StopDecision;
    block: (reason: string) => StopDecision;
    merge: (decisions: readonly StopDecision[]) => StopDecision;
  };
  edits: readonly {
    content: (input: unknown) => string | undefined;
    deny: (reason: string) => Decision;
  }[];
};
