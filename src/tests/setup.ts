import "@testing-library/jest-dom/matchers";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { server } from "./mock/node";

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Clean up after the tests are finished.
afterAll(() => server.close());

// Reset any request handlers that are declared as a part of our tests
// (i.e. for testing one-time error scenarios)
// Automatically unmount and cleanup DOM after the test is finished.
afterEach(() => {
  afterEach(() => server.resetHandlers());
  cleanup();
});
