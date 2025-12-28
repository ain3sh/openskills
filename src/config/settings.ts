import {
  applyEdits,
  findNodeAtLocation,
  modify,
  parse,
  parseTree,
  type FormattingOptions,
  type ParseError,
} from 'jsonc-parser';

export const DEFAULT_FORMATTING: FormattingOptions = {
  insertSpaces: true,
  tabSize: 2,
  eol: '\n',
};

export interface JsoncParseResult<T = unknown> {
  data: T;
  errors: ParseError[];
}

export function parseJsonc<T = unknown>(text: string): JsoncParseResult<T> {
  const errors: ParseError[] = [];
  const data = parse(text, errors, {
    allowTrailingComma: true,
    disallowComments: false,
  }) as T;
  return { data, errors };
}

export function hasJsoncPath(text: string, path: Array<string | number>): boolean {
  const tree = parseTree(text);
  if (!tree) return false;
  return Boolean(findNodeAtLocation(tree, path));
}

export function setJsoncPath(
  text: string,
  path: Array<string | number>,
  value: unknown,
  formattingOptions: FormattingOptions = DEFAULT_FORMATTING,
): string {
  const edits = modify(text, path, value, { formattingOptions });
  return applyEdits(text, edits);
}
