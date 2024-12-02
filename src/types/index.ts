export type Variant = "A" | "B";
export type Response = "yes" | "no";

export interface TestEvent {
  variant: Variant;
  response: Response;
  timestamp: string;
  sessionId: string;
}

export interface ABTestData {
  events: TestEvent[];
}
