module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
    es6: true,
  },
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  ignorePatterns: ['*.d.ts'],
  rules: {
    // General
    'no-console': [
      'warn', {
        allow: [
          'warn',
          'error',
          'info',
          'table',
          'debug',
        ],
      },
    ],
    camelcase: [
      'warn',
      {
        properties: 'always',
        ignoreDestructuring: true,
        ignoreImports: true,
        ignoreGlobals: true,
        allow: [
          '^[A-Z]',
          '^(r_)',
          '^(R_)',
          '^(cp_)',
          '^(CP_)',
          'required_error',
          'invalid_type_error',
        ],
      },
    ],
    'linebreak-style': 0,
    'max-len': 0,
    'object-curly-spacing': 2,
    'no-plusplus': [
      'error', {
        allowForLoopAfterthoughts: true,
      },
    ],
    'no-continue': 'off',
    'no-empty': 'off',
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1, maxBOF: 0 }],
    // Variables
    'one-var': 'error',
    'no-unused-vars': 'off',
    'no-underscore-dangle': 'off',
    'no-use-before-define': 'off',
    'no-shadow': 'off',
    // Functions
    'require-jsdoc': ['error', {
      require: {
        FunctionDeclaration: true,
        MethodDefinition: false,
        ClassDeclaration: false,
        ArrowFunctionExpression: false,
        FunctionExpression: false,
      },
    }],
    'no-param-reassign': [2, { props: false }],
    'consistent-return': 'off',
    'func-names': 'off',
    // Classes
    'no-useless-constructor': 'off',
    'class-methods-use-this': 'off',
    'lines-between-class-members': 'off',
    // Imports
    'import/no-named-default': 'off',
    'import/no-cycle': 'error',
    'import/prefer-default-export': 'off',
    'import/no-unresolved': [
      2, {
        ignore: ['^#'],
      },
    ],
    'import/extensions': 'off',
    // TS - General
    'no-restricted-syntax': [
      'error',
      {
        selector: 'LabeledStatement',
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],
    // TS - Types
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/prefer-namespace-keyword': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/ban-types': [
      'warn',
      {
        types: {
          '{}': {
            message: 'Use object instead',
            fixWith: 'object',
          },
        },
      },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    // TS - Variables
    '@typescript-eslint/no-shadow': ['error'],
    '@typescript-eslint/no-use-before-define': ['error'],
    '@typescript-eslint/no-unused-vars': [
      'warn', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    // TS -Functions
    '@typescript-eslint/no-empty-function': 'warn',
  },
  overrides: [
    {
      excludedFiles: [],
      files: [
        '**/*.test.ts',
        'tests/**/*.ts',
      ],
      rules: {
        'require-jsdoc': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'max-classes-per-file': 'off',
        '@typescript-eslint/no-empty-function': 'off',
      },
    },
  ],
  settings: {
    'import/extensions': ['.js', '.mjs', '.jsx', '.ts', '.tsx'],
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts', '.d.ts'],
      },
      typescript: {},
    },
  },
};

