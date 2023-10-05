import type { Config } from '@jest/types';

export default <Config.InitialOptions>{
  transform: {
    '.ts': ['ts-jest', { tsconfig: 'tests/tsconfig.json' }],
  },
  testRegex: '.*\\.test\\.ts$',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['js', 'ts'],
};
