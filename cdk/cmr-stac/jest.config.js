export const testEnvironment = "node";
export const roots = ["<rootDir>/test"];
export const testMatch = ["**/*.test.ts"];
export const transform = {
  "^.+\\.tsx?$": "ts-jest",
};
