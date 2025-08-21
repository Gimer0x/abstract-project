module.exports = {
  env: {
    node: true,
    es2021: true,
    commonjs: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['node', 'prettier'],
  rules: {
    // Indentation and formatting
    'indent': ['error', 2, { 'SwitchCase': 1 }],
    'no-tabs': 'error',
    'no-mixed-spaces-and-tabs': 'error',
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    'no-multiple-empty-lines': ['error', { 'max': 1, 'maxEOF': 0 }],
    
    // Prettier integration
    'prettier/prettier': 'error',
    
    // General JavaScript rules
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { 'avoidEscape': true }],
    'comma-dangle': ['error', 'always-multiline'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'comma-spacing': ['error', { 'before': false, 'after': true }],
    'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
    'keyword-spacing': ['error', { 'before': true, 'after': true }],
    'space-before-blocks': 'error',
    'space-before-function-paren': ['error', 'always'],
    'space-in-parens': ['error', 'never'],
    'space-infix-ops': 'error',
    'space-unary-ops': 'error',
    'spaced-comment': ['error', 'always'],
    
    // Variable and function rules
    'no-var': 'error',
    'prefer-const': 'error',
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-console': 'warn',
    'no-debugger': 'error',
    
    // Node.js specific rules
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-missing-import': 'off',
    'node/no-unpublished-import': 'off',
    'node/no-extraneous-import': 'off',
    'node/no-extraneous-require': 'off',
    
    // Code quality rules
    'no-duplicate-imports': 'error',
    'no-unreachable': 'error',
    'no-unreachable-loop': 'error',
    'no-unsafe-negation': 'error',
    'no-unsafe-optional-chaining': 'error',
    'no-unsafe-unary-negation': 'error',
    'require-atomic-updates': 'error',
    'use-isnan': 'error',
    'valid-typeof': 'error',
    
    // Best practices
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-throw-literal': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-expressions': 'error',
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    'prefer-promise-reject-errors': 'error',
    'require-await': 'error',
    'yoda': 'error',
  },
  overrides: [
    {
      files: ['*.test.js', '*.spec.js'],
      env: {
        jest: true,
      },
    },
  ],
};

