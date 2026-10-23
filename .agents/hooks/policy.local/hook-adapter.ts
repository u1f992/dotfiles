export type HookAdapter<Decision> = {
  allow: () => Decision;
  warn: (message: string) => Decision;
  stop: {
    message: (input: unknown) => string | undefined;
    block: (reason: string) => Decision;
  };
  edits: readonly {
    content: (input: unknown) => string | undefined;
    deny: (reason: string) => Decision;
  }[];
};
