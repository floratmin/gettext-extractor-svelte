import type { Config } from '@jest/types';

export default <Config.InitialOptions>{
  transform: {
    '.ts': 'ts-jest',
  },
  testRegex: '.*\\.test\\.ts$',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['js', 'ts'],
  globals: {
    'ts-jest': {
      tsconfig: 'tests/tsconfig.json',
    },
  },
};
