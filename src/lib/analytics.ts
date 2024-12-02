import { TestEvent } from "@/types";

class AnalyticsService {
  private static instance: AnalyticsService;
  private events: TestEvent[] = [];

  private constructor() {}

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  public trackEvent(event: TestEvent): void {
    this.events.push(event);
    this.persistEvents();

    fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }).catch(console.error);
  }

  public getEvents(): TestEvent[] {
    return this.events;
  }

  private persistEvents(): void {
    localStorage.setItem("ab-test-events", JSON.stringify(this.events));
  }

  public loadPersistedEvents(): void {
    const storedEvents = localStorage.getItem("ab-test-events");
    if (storedEvents) {
      this.events = JSON.parse(storedEvents);
    }
  }
}

export const analytics = AnalyticsService.getInstance();
