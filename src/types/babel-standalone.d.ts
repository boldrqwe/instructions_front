declare module '@babel/standalone' {
  export function transform(
    code: string,
    options?: {
      filename?: string;
      presets?: Array<any>;
      plugins?: Array<any>;
    }
  ): { code: string };
}
