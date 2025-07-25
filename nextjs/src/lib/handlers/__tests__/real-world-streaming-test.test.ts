/**
 * Real-World Agent Engine Streaming Test
 *
 * Tests our JSONFragmentProcessor against actual Agent Engine streaming data
 * from production logs to ensure it handles real-world fragmentation correctly.
 */

describe("Real-World Agent Engine Streaming", () => {
  // Mock controller for testing SSE output
  class MockStreamController {
    public sseEvents: string[] = [];

    enqueue(chunk: Uint8Array): void {
      const text = Buffer.from(chunk).toString();
      this.sseEvents.push(text);
    }

    getSSEEvents(): string[] {
      return this.sseEvents;
    }

    clear(): void {
      this.sseEvents = [];
    }
  }

  // Improved JSON Fragment Processor using part-level parsing
  class ImprovedJSONFragmentProcessor {
    private buffer: string = "";
    private currentAgent: string = "";
    private sentParts: Set<string> = new Set();
    private partsArrayStart: number = -1;

    constructor(private controller: MockStreamController) {}

    processChunk(chunk: string): void {
      this.buffer += chunk;
      this.extractCompletePartsFromBuffer();
    }

    private extractCompletePartsFromBuffer(): void {
      // Find the start of the parts array if we haven't found it yet
      if (this.partsArrayStart === -1) {
        const partsMatch = this.buffer.match(/"parts"\s*:\s*\[/);
        if (!partsMatch) return; // No parts array found yet
        this.partsArrayStart = partsMatch.index! + partsMatch[0].length;
      }

      // Extract content starting from the parts array
      const partsContent = this.buffer.substring(this.partsArrayStart);

      // Look for complete part objects using brace counting
      let braceCount = 0;
      let inString = false;
      let escapeNext = false;
      let partStartPos = -1;

      for (let i = 0; i < partsContent.length; i++) {
        const char = partsContent[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === "\\") {
          escapeNext = true;
          continue;
        }

        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }

        if (inString) continue;

        if (char === "{") {
          if (braceCount === 0) {
            partStartPos = i;
          }
          braceCount++;
        } else if (char === "}") {
          braceCount--;
          if (braceCount === 0 && partStartPos !== -1) {
            // We have a complete part object
            const partJson = partsContent.substring(partStartPos, i + 1);

            try {
              const part = JSON.parse(partJson);

              // Check if this is a valid part object with text
              if (part.text && typeof part.text === "string") {
                const partHash = this.hashPart(part);

                if (!this.sentParts.has(partHash)) {
                  this.emitCompletePart(part);
                  this.sentParts.add(partHash);
                }
              }
            } catch (parseError) {
              // Not a valid JSON object, continue
              console.log("Failed to parse part:", partJson.substring(0, 100));
            }

            partStartPos = -1;
          }
        }
      }
    }

    private hashPart(part: {
      text?: string;
      thought?: boolean;
      function_call?: unknown;
    }): string {
      const textHash = part.text?.substring(0, 100) || "";
      return `${textHash}-${part.thought}-${!!part.function_call}-${
        textHash.length
      }`;
    }

    private emitCompletePart(part: {
      text: string;
      thought?: boolean;
      function_call?: unknown;
    }): void {
      const sseData = {
        content: {
          parts: [part],
        },
        author: this.currentAgent || "goal_planning_agent",
      };

      // Convert to proper SSE format
      const sseEvent = `data: ${JSON.stringify(sseData)}\n\n`;
      this.controller.enqueue(Buffer.from(sseEvent));
    }
  }

  it("should handle the exact Agent Engine streaming data from production logs", () => {
    const mockController = new MockStreamController();
    const processor = new ImprovedJSONFragmentProcessor(mockController);

    // Chunk 1: Contains an incomplete first part (thought)
    const chunk1 = `{"content": {"parts": [{"thought": true, "text": "Alright, here's the plan. I'm aiming to make a million dollars as a developer in 2025. That's audacious, no question about it, but not impossible. It's going to demand a multi-pronged approach, and I need to break it down carefully.\\n\\nMy *primary goal* is to create that 8-hour plan, but the *key driver* is the weather forecast. So, let's dig in:\\n\\n**Phase 1: Gathering Intel**\\n\\n*   **Task 1: Weather \\u2013 The Foundation.**  I can't actually *get* real-time weather data, but I need to *pretend* to.  I\\u2019ll tell myself to \\\"access\\\" a weather API or website (like, say, AccuWeather).  I'll need the user to *actually* get the forecast.  I'll \\\"look\\\" for tomorrow's Bangalore weather.  I'll need to capture the temperature range, the chance of rain, and what the general conditions will be \\u2013 sunny, cloudy, or rainy.  This is step one, crucial for everything else.\\n\\n**Phase 2: Brainstorming & Filtering**\\n\\n*   **Task 2: Activity Exploration.** Next up: what can we *do* in Bangalore? I'll need to generate a good list of options. Since I don\\u2019t know the user's specific interests, I'll have to *assume* a general t`;

    // Chunk 2: Completes the first part AND has a complete second part
    const chunk2 = `arget audience and create diverse options.\\n\\nThis is my comprehensive plan for making money as a developer."}, {"text": "To achieve the ambitious goal of earning $1,000,000 USD as a developer in 2025, you'll need a strategic approach combining high-value skills with business acumen. Here's the complete roadmap."}, {"text": "Let me start by addressing the most viable paths"`;

    // Process chunk 1
    processor.processChunk(chunk1);
    const eventsAfterChunk1 = mockController.getSSEEvents().length;

    // Process chunk 2
    processor.processChunk(chunk2);
    const finalEventCount = mockController.getSSEEvents().length;

    const events = mockController.getSSEEvents();

    // ANALYSIS: Show exactly what happened
    const analysisData = {
      totalEventsEmitted: events.length,
      eventsAfterChunk1: eventsAfterChunk1,
      eventsAfterChunk2: finalEventCount,
      eventDetails: events.map((event, index) => {
        const eventData = JSON.parse(event.substring(6, event.length - 2));
        return {
          eventNumber: index + 1,
          isThought: eventData.content.parts[0].thought,
          textLength: eventData.content.parts[0].text.length,
          textStart: eventData.content.parts[0].text.substring(0, 100) + "...",
        };
      }),
    };

    // Force the analysis to be visible in test output
    expect(analysisData.totalEventsEmitted).toBeGreaterThan(0);

    // This will show our analysis in the test output when it fails/succeeds
    if (analysisData.totalEventsEmitted !== 2) {
      throw new Error(
        `EMISSION ANALYSIS: Expected 2 events but got ${
          analysisData.totalEventsEmitted
        }. Details: ${JSON.stringify(analysisData, null, 2)}`
      );
    }

    // Detailed validation
    expect(events).toHaveLength(2); // Should be exactly 2 events
    expect(eventsAfterChunk1).toBe(0); // No complete parts after chunk 1 (incomplete)
    expect(finalEventCount).toBe(2); // Both parts complete after chunk 2

    // Validate first event (thought)
    const firstEventData = JSON.parse(
      events[0].substring(6, events[0].length - 2)
    );
    expect(firstEventData.content.parts[0]).toEqual(
      expect.objectContaining({
        thought: true,
        text: expect.stringContaining("Alright, here's the plan"),
      })
    );

    // Validate second event (response)
    const secondEventData = JSON.parse(
      events[1].substring(6, events[1].length - 2)
    );
    expect(secondEventData.content.parts[0]).toEqual(
      expect.objectContaining({
        text: expect.stringContaining("To achieve the ambitious goal"),
      })
    );

    // Force display of our analysis by creating a successful expectation with the data
    expect({
      message: "EMISSION ANALYSIS COMPLETE",
      data: analysisData,
    }).toEqual({
      message: "EMISSION ANALYSIS COMPLETE",
      data: expect.objectContaining({
        totalEventsEmitted: 2,
        eventsAfterChunk1: 0,
        eventsAfterChunk2: 2,
      }),
    });
  });

  it("should handle fragmented JSON parts correctly", () => {
    const mockController = new MockStreamController();
    const processor = new ImprovedJSONFragmentProcessor(mockController);

    // Simulate a part that gets split across multiple chunks
    const chunk1 = `{"content": {"parts": [{"thought": true, "text": "First part of`;
    const chunk2 = ` the thought content that spans multiple chunks"}, {"text": "Second part`;
    const chunk3 = ` content here", "thought": false}]}}`;

    processor.processChunk(chunk1);
    let events = mockController.getSSEEvents();
    expect(events).toHaveLength(0); // No complete parts yet

    processor.processChunk(chunk2);
    events = mockController.getSSEEvents();
    expect(events).toHaveLength(1); // First part should be complete now

    processor.processChunk(chunk3);
    events = mockController.getSSEEvents();
    expect(events).toHaveLength(2); // Second part should be complete

    // Verify first part
    const firstEventData = JSON.parse(
      events[0].substring(6, events[0].length - 2)
    );
    expect(firstEventData.content.parts[0]).toEqual({
      thought: true,
      text: "First part of the thought content that spans multiple chunks",
    });

    // Verify second part
    const secondEventData = JSON.parse(
      events[1].substring(6, events[1].length - 2)
    );
    expect(secondEventData.content.parts[0]).toEqual({
      text: "Second part content here",
      thought: false,
    });
  });

  it("should not emit duplicate parts", () => {
    const mockController = new MockStreamController();
    const processor = new ImprovedJSONFragmentProcessor(mockController);

    // Send the same part twice
    const chunk = `{"content": {"parts": [{"text": "Same content", "thought": false}]}}`;

    processor.processChunk(chunk);
    processor.processChunk(chunk);

    const events = mockController.getSSEEvents();
    expect(events).toHaveLength(1); // Should only emit once
  });

  it("should handle malformed parts gracefully", () => {
    const mockController = new MockStreamController();
    const processor = new ImprovedJSONFragmentProcessor(mockController);

    // Mix of valid and invalid parts
    const chunk = `{"content": {"parts": [{"text": "Valid part"}, {"invalid": "missing text"}, {"text": "Another valid part"}]}}`;

    processor.processChunk(chunk);

    const events = mockController.getSSEEvents();
    expect(events).toHaveLength(2); // Should only emit the 2 valid parts

    // Check that valid parts were emitted
    const firstEventData = JSON.parse(
      events[0].substring(6, events[0].length - 2)
    );
    expect(firstEventData.content.parts[0].text).toBe("Valid part");

    const secondEventData = JSON.parse(
      events[1].substring(6, events[1].length - 2)
    );
    expect(secondEventData.content.parts[0].text).toBe("Another valid part");
  });
});
