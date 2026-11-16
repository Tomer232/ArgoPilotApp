import { getConfig } from "@/lib/config";

/** Runs once when the server starts: fail right away if a setting in .env.local is missing. */
export function register() {
  getConfig();
}
