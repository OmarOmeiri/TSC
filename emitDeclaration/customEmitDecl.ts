import {
  DiagnosticCategory,
  Project,
  SourceFile,
  SourceFileEmitOptions,
} from 'ts-morph';
import ts from 'typescript';
import glob from 'glob';
import { readFile, writeFile } from 'fs/promises';
import logger from '../logger';
import {
  Times,
  TimesJson,
} from './consts';

export type EmitOptions = {
  rootPath?: string;
  tsconfigName: string;
  includeExtraFiles?: string[]
  filesPattern?: string,
}

export {
  SourceFile,
  SourceFileEmitOptions,
} from 'ts-morph';

export default class TSCEmitter {
  private rootPath: string;
  private startTime: number;
  private project: Project;
  constructor({
    rootPath = process.cwd(),
    tsconfigName,
    includeExtraFiles = [],
    filesPattern = `${rootPath.replace(/\/$/, '')}/!(node_modules)/!(tests)/**/*.ts`,
  }: EmitOptions) {
    this.rootPath = rootPath;
    this.startTime = Date.now();
    const tsconfigPath = ts.findConfigFile(rootPath, ts.sys.fileExists, tsconfigName);
    if (!tsconfigPath) {
      logger.error('No tsconfig.json found!');
      process.exit(1);
    }
    const files = glob.sync(filesPattern);
    includeExtraFiles.forEach((f) => files.push(f));
    this.project = new Project({
      tsConfigFilePath: tsconfigPath,
    });

    this.project.addSourceFilesAtPaths(files);
    const filesLength = this.project.getSourceFiles().length;
    this.getAvgTime(filesLength);

    const compilerOptions = this.project.compilerOptions.get();
    if (!compilerOptions.outDir) {
      logger.error('No `outDir` in tsconfig.json');
      process.exit(1);
    }

    this.preEmitCheckErrors();
  }

  private async saveTime(time: number, filesLength: number) {
    let times: Times = [];
    try {
      console.log('TimesJson: ', TimesJson);
      times = JSON.parse((await readFile(TimesJson)).toString()) as Times;
      console.log('times: ', times);
    } catch {
      times = [];
    }
    times.push({ time, files: filesLength });
    if (times.length > 10) times.shift();
    await writeFile(TimesJson, JSON.stringify(times));
  }

  private async getAvgTime(filesLength: number) {
    let times: Times = [];
    try {
      times = JSON.parse((await readFile(TimesJson)).toString()) as Times;
    } catch {
      times = [];
    }
    if (!times.length) return;
    const avgTimePerFile = times.map((t) => t.time / t.files)
      .reduce((acc, val) => val + acc) / times.length;
    const minDecimal = ((avgTimePerFile * filesLength) / 60000);

    const mins = parseInt(`${minDecimal}`, 10);
    const remainder = minDecimal - mins;
    const secs = parseInt(`${remainder * 60}`, 10);
    logger.log(`\nGo get some coffee, this will take approximately ${mins}min ${secs}s`);
  }

  /**
 * Checks is a sourceFile is an external library
 * @param sourceFile
 */
  private isImportALib(
    sourceFile: SourceFile,
  ): boolean {
    return sourceFile.getFilePath().includes('node_modules')
    || sourceFile.isInNodeModules()
    || sourceFile.isFromExternalLibrary();
  }

  private preEmitCheckErrors() {
    const errors = this.project.getPreEmitDiagnostics().map((d) => ({
      text: d.getMessageText(),
      fileName: d.getSourceFile()?.getFilePath()?.replace(this.rootPath, ''),
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
      logger.log(`\nPlease fix these errors or run this script with \x1b[1m\x1b[33m"-- force"${logger.defaultStyle} at your own risk`);
      process.exit(1);
    }
  }

  async emit(beforeEmit: (file: SourceFile) => SourceFileEmitOptions | undefined = () => (undefined)) {
    let i = 1;
    const filesLength = this.project.getSourceFiles().length;
    console.log('logger.defaultStyle: ', logger.defaultStyle);
    for await (const file of this.project.getSourceFiles()) {
      const pct = Math.min(Math.round((i / filesLength) * 100), 100);
      const imports = file.getImportDeclarations();

      logger.writeSameLine(
        'Transpiling files:'
        // eslint-disable-next-line no-useless-escape
        + ` ${logger.style.bold.magentaBright(i.toString())}${logger.defaultStyle}`
        + ` of ${logger.style.bold.magentaBright(filesLength.toString())} [${logger.style.yellow.bold(`${pct}%`)}]`,
      );

      for (const iDecl of imports) {
        const importedSourceFile = iDecl.getModuleSpecifierSourceFile();
        if (importedSourceFile && !this.isImportALib(importedSourceFile)) {
          const importedPath = importedSourceFile?.getFilePath();
          let rel = file.getRelativePathTo(importedPath).replace(/\.ts$|\.js/, '');
          if (/^[a-z]/i.test(rel)) rel = `./${rel}`;
          const moduleSpec = iDecl.getModuleSpecifier();
          moduleSpec.replaceWithText(`'${rel}'`);
        }
      }

      const baseEmitOptions: SourceFileEmitOptions = {
        emitOnlyDtsFiles: true,
      };

      const options = beforeEmit(file) || baseEmitOptions;

      file.emit(options);
      i = Math.min(i + 1, filesLength);
    }

    const end = Date.now();
    this.saveTime(end - this.startTime, filesLength);
  }
}

