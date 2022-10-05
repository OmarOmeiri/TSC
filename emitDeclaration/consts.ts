import type { ts } from 'ts-morph';

export const TimesJson = `${__dirname}/times.json`;
export type Times = {
  time: number,
  files: number
}[]

export type TSConfig = {
  extends?: string,
  compilerOptions: ts.CompilerOptions
  exclude: string[],
  include: string[],
  files: string[]
}
