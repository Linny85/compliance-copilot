import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/setupTests.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^(.*)\\.css$": "<rootDir>/tests/styleMock.js",
  },
  testMatch: ["**/tests/**/*.test.(ts|tsx)"],
};
export default config;
