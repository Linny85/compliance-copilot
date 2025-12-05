import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

// Basic jsdom polyfills used by dashboard widgets
if (!window.matchMedia) {
	// @ts-ignore
	window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {} });
}
