module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/app.ts",
    "!src/config/swagger.ts",
  ],
  setupFilesAfterFramework: ["./tests/setup.ts"],
};