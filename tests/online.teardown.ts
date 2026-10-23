import { rmSync } from "node:fs";
import { persist } from "../playwright.online.config.ts";

/** Throws away the run's local D1 and Durable Object state. */
export default function teardown(): void {
  rmSync(persist, { recursive: true, force: true });
}
