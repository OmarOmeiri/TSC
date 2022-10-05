/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-restricted-syntax */
import { readFileSync, writeFileSync } from 'fs';
import {
  DiagnosticCategory,
  Project,
  SourceFile,
} from 'ts-morph';
import ts from 'typescript';
import glob from 'glob';
import logger from '../logger';
import {
  PATH,
  Times,
  TimesJson,
  TSConfig,
} from './consts';

console.log(`\x1b[34m
  ╭─────────────────────────────────────────╮
  │                                         │
  │            Custom \x1b[1mTS\x1b[0m\x1b[34m Build              │
  │                                         │
  ╰─────────────────────────────────────────╯
  `);

const start = Date.now();

const includeFiles = [
  `${PATH}/Backend/package.json`,
  `${PATH}/Backend/src/AppRouter.ts`,
];

const tsConfigPath = ts.findConfigFile(`${PATH}/Backend`, ts.sys.fileExists, 'tsconfig.production.json') as string;
if (!tsConfigPath) {
  logger.error('No tsconfig.json found!');
  process.exit(1);
}

if (!PATH) {
  logger.error(`PROJPATH is not defined. Please check the ${logger.style.yellow.bold('lullo.env')} file.`);
  process.exit(1);
}

const saveTime = (time: number, filesLength: number) => {
  const times = JSON.parse(readFileSync(TimesJson).toString()) as Times;
  times.push({ time, files: filesLength });
  if (times.length > 10) times.shift();
  writeFileSync(TimesJson, JSON.stringify(times));
};

const getAvgTime = (filesLength: number) => {
  const times = JSON.parse(readFileSync(TimesJson).toString()) as Times;
  const avgTimePerFile = times.map((t) => t.time / t.files)
    .reduce((acc, val) => val + acc) / times.length;
  const minDecimal = ((avgTimePerFile * filesLength) / 60000);

  const mins = parseInt(`${minDecimal}`, 10);
  const remainder = minDecimal - mins;
  const secs = parseInt(`${remainder * 60}`, 10);
  return `${mins}min ${secs}s`;
};

const files = glob.sync(`${PATH}/Backend/!(node_modules)/!(tests)/**/*.ts`);
includeFiles.forEach((f) => files.push(f));

/**
 * Unused function to get the tsconfig.json file.
 *
 * But I Like it, so I'm going to leave it here
 * @param path
 * @returns
 */
const getTsConfig = (path: string) => {
  const tsConfig = readFileSync(path).toString();
  const parsed = JSON.parse(tsConfig) as TSConfig;
  // @ts-ignore
  parsed.compilerOptions.moduleResolution = ts.ModuleResolutionKind.NodeJs;
  if (parsed.extends) {
    const extendPath = parsed.extends.replace(/^\.\//, '');
    const tsConfigDir = tsConfigPath.split('/').slice(0, -1).join('/');
    const extendFile = JSON.parse(readFileSync(`${tsConfigDir}/${extendPath}`).toString()) as TSConfig;
    Object.keys(extendFile)
      .forEach((k) => {
        const key = k as keyof TSConfig;
        if (parsed[key]) {
          parsed[key] = {
            // @ts-ignore
            ...parsed[key],
            // @ts-ignore
            ...extendFile[key],
          };
        }
      });
    delete parsed.extends;
  }
  return parsed;
};

const project = new Project({
  tsConfigFilePath: tsConfigPath,
});

project.addSourceFilesAtPaths(files);

const filesLength = project.getSourceFiles().length;

logger.log(`Go get some coffee, this will take approximately ${getAvgTime(filesLength)}`);

const tsConfig = project.compilerOptions.get();
if (!tsConfig.outDir) {
  logger.error('No outDir in tsconfig.json');
  process.exit(1);
}

/**
 * Checks is a sourceFile is an external library
 * @param sourceFile
 */
export function isImportALib(
  sourceFile: SourceFile,
): boolean {
  return sourceFile.getFilePath().includes('node_modules')
    || sourceFile.isInNodeModules()
    || sourceFile.isFromExternalLibrary();
}

const errors = project.getPreEmitDiagnostics().map((d) => ({
  text: d.getMessageText(),
  fileName: d.getSourceFile()?.getFilePath()?.replace(PATH, ''),
  loc: `${d.getStart()}:${d.getLength()}`,
  category: d.getCategory(),
  code: d.getCode(),
}));

if (errors.length === 0) {
  logger.log('\x1b[35mCustom TS error checking: \x1b[32mpassed\x1b[0m ✔\n');
} else {
  errors.forEach((e) => {
    if (e.category === DiagnosticCategory.Warning) {
      logger.warn(`${logger.style.cyan.bold(`${e.fileName}`)}`
      + ` ${logger.style.yellow(e.loc)}`
      + ` ${logger.style.gray.bold(`TS${e.code}`)}\x1b[0m\n${e.text}\n`);
    } else if (e.category === DiagnosticCategory.Message || e.category === DiagnosticCategory.Suggestion) {
      logger.info(`${logger.style.cyan.bold(`${e.fileName}`)}`
      + ` ${logger.style.yellow(e.loc)}`
      + ` ${logger.style.gray.bold(`TS${e.code}`)}${e.text}\n`);
    } else {
      logger.error(`${logger.style.cyan.bold(`${e.fileName}`)}`
      + ` ${logger.style.yellow(e.loc)}`
      + ` ${logger.style.gray.bold(`TS${e.code}`)}${e.text}\n`);
    }
  });
  logger.log(`\x1b[4mTotal errors found\x1b[0m: \x1b[1m\x1b[31m${errors.length}\x1b[0m\n`);
  logger.log(`\nPlease fix these errors or run this script with \x1b[1m\x1b[33m"-- force"${logger.defaultStyle[0]} at your own risk`);
  process.exit(1);
}

/**
 * Emits the files to outDir
 */
async function emit() {
  let i = 1;
  for await (const file of project.getSourceFiles()) {
    const pct = Math.min(Math.round((i / filesLength) * 100), 100);
    const imports = file.getImportDeclarations();

    logger.writeSameLine(
      'Transpiling files:'
      + ` ${logger.style.bold.magentaBright(i.toString())}${logger.defaultStyle[0]}`
      + ` of ${logger.style.bold.magentaBright(filesLength.toString())} [${logger.style.yellow.bold(`${pct}%`)}]`,
    );

    imports.forEach(async (iDecl) => {
      const importedSourceFile = iDecl.getModuleSpecifierSourceFile();
      if (importedSourceFile && !isImportALib(importedSourceFile)) {
        const importedPath = importedSourceFile?.getFilePath();
        let rel = file.getRelativePathTo(importedPath).replace(/\.ts$|\.js/, '');
        if (/^[a-z]/i.test(rel)) rel = `./${rel}`;
        const moduleSpec = iDecl.getModuleSpecifier();
        moduleSpec.replaceWithText(`'${rel}'`);
      }
    });
    file.emit();
    i = Math.min(i + 1, filesLength);
  }
}
/** */
(async () => {
  await emit();
  const end = Date.now();
  saveTime(end - start, filesLength);
})();
