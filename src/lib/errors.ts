import { MAX_BRIEF_CHARS } from "./schema";

export const ERROR_CODES = [
  "empty_input",
  "too_long",
  "bad_request",
  "not_configured",
  "rate_limited",
  "usage_cap",
  "provider_rate_limited",
  "provider_timeout",
  "provider_unavailable",
  "provider_config",
  "declined",
  "invalid_response",
  "network",
  "unknown",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const DEMO_NOTICE =
  "Live analysis isn’t connected in this demo. Choose an example to explore the experience.";

interface ErrorCopy {
  title: string;
  detail: string;
  /** Whether offering "Try again" makes sense. Retries are always manual. */
  retryable: boolean;
}

export const ERROR_COPY: Record<ErrorCode, ErrorCopy> = {
  empty_input: {
    title: "Add a brief first",
    detail: "Paste or type the brief you want to decode.",
    retryable: false,
  },
  too_long: {
    title: "This brief is too long",
    detail: `Shorten it to ${MAX_BRIEF_CHARS.toLocaleString("en-GB")} characters or fewer. Nothing has been cut for you.`,
    retryable: false,
  },
  bad_request: {
    title: "That request couldn’t be read",
    detail: "Reload the page and try again.",
    retryable: false,
  },
  not_configured: {
    title: "Live analysis isn’t connected",
    detail: DEMO_NOTICE,
    retryable: false,
  },
  rate_limited: {
    title: "Too many requests",
    detail: "You’ve reached the limit for now. Wait a moment before trying again.",
    retryable: true,
  },
  usage_cap: {
    title: "Today’s demo allowance is used up",
    detail:
      "This public demo has a daily cap on live analyses. Try again tomorrow, or explore the examples.",
    retryable: false,
  },
  provider_rate_limited: {
    title: "The AI provider is busy",
    detail: "It is limiting requests right now. Wait a minute, then try again.",
    retryable: true,
  },
  provider_timeout: {
    title: "The analysis took too long",
    detail: "The AI provider didn’t respond in time. Your brief is unchanged — try again.",
    retryable: true,
  },
  provider_unavailable: {
    title: "The AI provider couldn’t be reached",
    detail: "This is usually temporary. Your brief is unchanged — try again shortly.",
    retryable: true,
  },
  provider_config: {
    title: "Live analysis is misconfigured",
    detail:
      "The server’s AI settings were rejected. If you run this app, check the API key and model name.",
    retryable: false,
  },
  declined: {
    title: "The AI provider declined this brief",
    detail: "No analysis was produced. Try rewording the brief.",
    retryable: false,
  },
  invalid_response: {
    title: "The analysis came back in an unusable form",
    detail:
      "Rather than show something unreliable, nothing is displayed. Try again.",
    retryable: true,
  },
  network: {
    title: "Couldn’t reach the server",
    detail: "Check your connection. Your brief is unchanged — try again.",
    retryable: true,
  },
  unknown: {
    title: "Something went wrong",
    detail: "Your brief is unchanged. Try again.",
    retryable: true,
  },
};

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value);
}
