/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-bitwise */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
import * as ts from 'typescript';
import * as fs from 'fs';

interface DocEntry {
  name?: string;
  fileName?: string;
  comment?: string;
  type?: string;
  constructors?: DocEntry[];
  parameters?: DocEntry[];
  returnType?: string;
  methods?: {
    name?: string,
    type?: string,
    comment?: string,
  }[]
}

/** Generate documentation for all classes in a set of .ts files */
function generateDocumentation(
  fileNames: string[],
  options: ts.CompilerOptions,
): void {
  // Build a program using the set of root file names in fileNames
  const program = ts.createProgram(fileNames, options);
  const checker = program.getTypeChecker();
  const output: DocEntry[] = [];

  // Visit every sourceFile in the program
  for (const file of fileNames) {
    const sourceFile = program.getSourceFile(file) as ts.SourceFile;
    if (!sourceFile.isDeclarationFile) {
      // Walk the tree to search for classes
      ts.forEachChild(sourceFile, visit);
    }
  }

  // print out the doc
  fs.writeFileSync('classes.json', JSON.stringify(output, undefined, 4));

  /** visit nodes finding exported classes */
  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node) && node.name) {
      // This is a top level class, get its symbol
      const symbol = checker.getSymbolAtLocation(node.name);
      // console.log(symbol);
      if (symbol) {
        const classDetails = serializeClass(symbol);
        const methodDetails = serializeMethods(symbol.exports);
        const details = classDetails;
        details.methods = methodDetails;
        output.push(details);
      }
    }
  }

  /** Serialize a class symbol information */
  function serializeClass(symbol: ts.Symbol) {
    const details = serializeClassSymbol(symbol);

    // Get the construct signatures
    const constructorType = checker.getTypeOfSymbolAtLocation(
      symbol,
      symbol.valueDeclaration!,
    );
    details.constructors = constructorType
      .getConstructSignatures()
      .map(serializeSignature);
    return details;
  }

  /** Serialize method symbol information */
  function serializeMethods(symbols: ts.SymbolTable | undefined) {
    const methodDetails: DocEntry['methods'] = [];
    if (symbols) {
      const symbolsArr: ts.Symbol[] = Array.from((symbols as Map<any, any>).values());
      symbolsArr.forEach((symbol) => {
        methodDetails.push(serializeMethodSymbol(symbol));
      });
    }
    return methodDetails;
  }

  /** Serialize a symbol into a json object */
  function serializeClassSymbol(symbol: ts.Symbol): DocEntry {
    return {
      name: symbol.getName(),
      comment: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
      type: checker.typeToString(
        checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!),
      ),
    };
  }

  /** Serialize a symbol into a json object */
  function serializeMethodSymbol(symbol: ts.Symbol): {
    name: string,
    comment: string,
    type: string,
  } {
    return {
      name: symbol.getName(),
      comment: ts.displayPartsToString(symbol.getDocumentationComment(checker)),
      type: checker.typeToString(
        checker.getTypeOfSymbolAtLocation(symbol, symbol.valueDeclaration!),
      ),
    };
  }

  /** Serialize a signature (call or construct) */
  function serializeSignature(signature: ts.Signature) {
    return {
      parameters: signature.parameters.map(serializeClassSymbol),
      returnType: checker.typeToString(signature.getReturnType()),
      documentation: ts.displayPartsToString(signature.getDocumentationComment(checker)),
    };
  }
}

generateDocumentation(['INSERT FILENAMES HERE'], {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
});
