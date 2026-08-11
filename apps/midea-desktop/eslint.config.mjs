import globals from 'globals'

import sharedConfig from '../../eslint.config.shared.mjs'

export default [
  ...sharedConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              message: 'Midea Desktop must use public shared contracts instead of importing the generic Desktop.',
              regex: '(^|/)desktop(/|$)'
            }
          ]
        }
      ]
    }
  }
]
