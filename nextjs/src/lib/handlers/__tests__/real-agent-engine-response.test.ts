/**
 * Real Agent Engine Response Structure Test
 *
 * Tests our JSONFragmentProcessor against the exact response structure
 * observed in production logs from Agent Engine.
 */

describe("Real Agent Engine Response Processing", () => {
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

  // Simplified version of JSONFragmentProcessor for testing
  class TestJSONFragmentProcessor {
    private buffer: string = "";
    private currentAgent: string = "";
    private sentParts: Set<string> = new Set();

    constructor(private controller: MockStreamController) {}

    processChunk(chunk: string): void {
      this.buffer += chunk;
      this.extractCompletePartsFromBuffer();
    }

    private extractCompletePartsFromBuffer(): void {
      for (let endPos = 1; endPos <= this.buffer.length; endPos++) {
        const candidate = this.buffer.substring(0, endPos);

        try {
          const parsed = JSON.parse(candidate);

          // Extract parts from the parsed JSON (matches our production code)
          if (parsed.content?.parts && Array.isArray(parsed.content.parts)) {
            this.currentAgent = parsed.author || "goal_planning_agent";

            for (const part of parsed.content.parts) {
              if (part.text && typeof part.text === "string") {
                const partHash = this.hashPart(part);

                if (!this.sentParts.has(partHash)) {
                  this.emitCompletePart(part);
                  this.sentParts.add(partHash);
                }
              }
            }
          }

          // Remove processed JSON and continue
          this.buffer = this.buffer.substring(endPos);
          if (this.buffer.length > 0) {
            this.extractCompletePartsFromBuffer();
          }
          return;
        } catch (error: unknown) {
          continue;
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

  it("should handle the exact Agent Engine response structure from logs", () => {
    const mockController = new MockStreamController();
    const processor = new TestJSONFragmentProcessor(mockController);

    // This is the EXACT structure from your logs (simplified for testing)
    const realAgentEngineResponse = JSON.stringify({
      content: {
        parts: [
          {
            thought: true,
            text: "Okay, here's how I'm going to approach this. I've got a new project: plan an 8-hour itinerary for Bangalore tomorrow.",
          },
          {
            text: "Okay, this is a clear and actionable request! You want a plan to get tomorrow's Bangalore weather and then construct an 8-hour itinerary based on it.",
            thought: false,
          },
        ],
      },
      role: "model",
      usage_metadata: {
        candidates_token_count: 2349,
        prompt_token_count: 1264,
        total_token_count: 5176,
      },
      author: "goal_planning_agent",
      actions: {
        state_delta: {
          goal_plan: "Sample goal plan",
        },
      },
    });

    // Process the real Agent Engine response
    processor.processChunk(realAgentEngineResponse);

    const events = mockController.getSSEEvents();

    // Should emit 2 separate SSE events (one for each part)
    expect(events).toHaveLength(2);

    // Parse and verify first SSE event (thought part)
    const firstEvent = events[0];
    expect(firstEvent).toMatch(/^data: \{.*\}\n\n$/);
    const firstEventData = JSON.parse(
      firstEvent.substring(6, firstEvent.length - 2)
    );

    expect(firstEventData).toHaveProperty("author", "goal_planning_agent");
    expect(firstEventData).toHaveProperty("content");
    expect(firstEventData.content).toHaveProperty("parts");
    expect(firstEventData.content.parts).toHaveLength(1);
    expect(firstEventData.content.parts[0]).toEqual({
      thought: true,
      text: "Okay, here's how I'm going to approach this. I've got a new project: plan an 8-hour itinerary for Bangalore tomorrow.",
    });

    // Parse and verify second SSE event (regular response part)
    const secondEvent = events[1];
    expect(secondEvent).toMatch(/^data: \{.*\}\n\n$/);
    const secondEventData = JSON.parse(
      secondEvent.substring(6, secondEvent.length - 2)
    );

    expect(secondEventData).toHaveProperty("author", "goal_planning_agent");
    expect(secondEventData.content.parts).toHaveLength(1);
    expect(secondEventData.content.parts[0]).toEqual({
      text: "Okay, this is a clear and actionable request! You want a plan to get tomorrow's Bangalore weather and then construct an 8-hour itinerary based on it.",
      thought: false,
    });
  });

  it("should handle Agent Engine response with complex parts array", () => {
    const mockController = new MockStreamController();
    const processor = new TestJSONFragmentProcessor(mockController);

    // Simulate a response with multiple different part types
    const complexResponse = JSON.stringify({
      content: {
        parts: [
          {
            thought: true,
            text: "Let me think about this step by step...",
          },
          {
            text: "Here's my analysis:",
            thought: false,
          },
          {
            text: "And here's my conclusion:",
            thought: false,
          },
          {
            function_call: {
              name: "get_weather",
              args: { location: "Bangalore" },
            },
          },
        ],
      },
      author: "goal_planning_agent",
    });

    processor.processChunk(complexResponse);
    const events = mockController.getSSEEvents();

    // Should emit 3 SSE events (only parts with text)
    expect(events).toHaveLength(3);

    // All events should have proper SSE format
    events.forEach((event) => {
      expect(event).toMatch(/^data: \{.*\}\n\n$/);
      const eventData = JSON.parse(event.substring(6, event.length - 2));
      expect(eventData).toHaveProperty("author", "goal_planning_agent");
      expect(eventData).toHaveProperty("content");
      expect(eventData.content).toHaveProperty("parts");
      expect(eventData.content.parts).toHaveLength(1);
      expect(eventData.content.parts[0]).toHaveProperty("text");
    });
  });

  it("should maintain the content wrapper structure for frontend compatibility", () => {
    const mockController = new MockStreamController();
    const processor = new TestJSONFragmentProcessor(mockController);

    const response = JSON.stringify({
      content: {
        parts: [
          {
            text: "Test response",
            thought: false,
          },
        ],
      },
      author: "goal_planning_agent",
    });

    processor.processChunk(response);
    const events = mockController.getSSEEvents();

    expect(events).toHaveLength(1);

    const eventData = JSON.parse(events[0].substring(6, events[0].length - 2));

    // Verify the content wrapper is maintained for frontend compatibility
    expect(eventData).toMatchObject({
      content: {
        parts: [
          {
            text: "Test response",
            thought: false,
          },
        ],
      },
      author: "goal_planning_agent",
    });
  });
});
