import type { ts } from 'ts-morph';

export const PATH: string = process.env.PROJPATH as string;
export const USER: string = process.env.PROJUSER as string;
export const TimesJson = `${PATH}/Backend/scripts/TSC/customBuild/times.json`;
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
