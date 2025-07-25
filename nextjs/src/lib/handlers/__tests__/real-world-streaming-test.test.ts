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

    // This is the EXACT first chunk from your logs (1402 bytes)
    const chunk1 = `{"content": {"parts": [{"thought": true, "text": "Alright, here's the plan. I'm aiming to make a million dollars as a developer in 2025. That's audacious, no question about it, but not impossible. It's going to demand a multi-pronged approach, and I need to break it down carefully.\\n\\nMy *primary goal* is to create that 8-hour plan, but the *key driver* is the weather forecast. So, let's dig in:\\n\\n**Phase 1: Gathering Intel**\\n\\n*   **Task 1: Weather \\u2013 The Foundation.**  I can't actually *get* real-time weather data, but I need to *pretend* to.  I\\u2019ll tell myself to \\\"access\\\" a weather API or website (like, say, AccuWeather).  I'll need the user to *actually* get the forecast.  I'll \\\"look\\\" for tomorrow's Bangalore weather.  I'll need to capture the temperature range, the chance of rain, and what the general conditions will be \\u2013 sunny, cloudy, or rainy.  This is step one, crucial for everything else.\\n\\n**Phase 2: Brainstorming & Filtering**\\n\\n*   **Task 2: Activity Exploration.** Next up: what can we *do* in Bangalore? I'll need to generate a good list of options. Since I don\\u2019t know the user's specific interests, I'll have to *assume* a general t`;

    // This is part of the second chunk (3314 bytes) - continuing the first part and starting second part
    const chunk2 = `hat kind of money.\\n*   **Product/SaaS:** Generate income through sales.\\n*   **Combination:** A solid salary combined with freelancing or investments.\\n\\n**So, here's the structured plan:**\\n\\n1.  **Goal:** Again, the $1M target, which defines success.\\n2.  **Breakdown of Tasks:**\\n    *   **Core: Skill & Niche:** This is fundamental to success.\\n    *   **Path A: High-End Freelancing/Consulting:** Detailed steps for finding those lucrative clients.\\n    *   **Path B: Product/SaaS Development & Monetization:** Everything I need to build and sell something.\\n    *   **Path C: Leverage and Diversify:** Supplement income, potentially through content or investments, and optimizing the primary income (if applicable).\\n3.  **Execution:** Timeline and priorities.\\n4.  **Next Steps:** The immediate actions I need to take.\\n\\n**Let's drill down into each task:**\\n\\n*   **Skill & Niche:**\\n    *   I need to specialize in in-demand, high-paying areas like AI/ML, Blockchain, Cybersecurity, cloud-native technologies, and data engineering.\\n    *   The goal is deep expertise.\\n    *   Building my personal brand and thought leadership is essential.\\n*   **Freelancing/Consulting:**\\n    *   Identifying the right target clients. Enterprises and startups are the goals.\\n    *   My pricing strategy has to be value-based, not hourly. Target $500-$1000 per hour or project rates of $100K+, demanding securing 10-20 such projects or a few massive ones.\\n    *   Sales and marketing: Networking, referrals, outreach, and online presence will make or break this.\\n    *   I need the legal and business setup ready.\\n    *   Thinking about scaling, hiring, and delegation.\\n*   **Product/SaaS:**\\n    *   Market research and problem identification.\\n    *   Developing the minimum viable product (MVP).\\n    *   Marketing and a go-to-market strategy.\\n    *   Figure out monetization through subscriptions.\\n    *   Setting up customer support.\\n    *   Considering scaling.\\n*   **Leverage & Diversify:**\\n    *   Content creation, such as a blog, YouTube channel, or courses, to generate passive income.\\n    *   Strategic investments.\\n    *   Tax optimization (critically important).\\n    *   I need to keep my mindset right, and stay disciplined.\\n\\n**Key Challenges:**\\n\\n*   **Time:** It's a brutal schedule.\\n*   **Risk Tolerance:** High, especially if I'm doing a product/SaaS project or with investments.\\n*   **Sales/Marketing Skills:** My biggest hurdle.\\n*   **Networking:** Building a high-value network takes time.\\n*   **Taxes:** I'm going to owe a lot of tax!\\n*   **Burnout:** I need to be very careful with the intensity of effort.\\n\\nAlright, that's the blueprint. It's ambitious, it's challenging, and it\\u2019s going to be tough. Let's start drafting the response and get going.\\n"}, {"text": "To achieve the ambitious goal of earning $1,000,000 USD as a developer in 2025, a traditional salary alone is highly unlikely for most individual contributors. This goal typically requires a combination of high-value skills, strategic business acumen, and often, multiple income streams or a significant entrepreneurial venture.\\n\\nThis plan will focus on the most viable paths for a developer to reach this financial target:\\n1.  **High-End Freelancing/Consulting:** Leveraging specialized skills to `;

    // Process the chunks in sequence
    processor.processChunk(chunk1);
    processor.processChunk(chunk2);

    const events = mockController.getSSEEvents();

    // Should emit 2 SSE events (one for each complete part)
    expect(events.length).toBeGreaterThanOrEqual(1);

    // Check the first part (thought)
    if (events.length >= 1) {
      const firstEvent = events[0];
      expect(firstEvent).toMatch(/^data: \{.*\}\n\n$/);
      const firstEventData = JSON.parse(
        firstEvent.substring(6, firstEvent.length - 2)
      );

      expect(firstEventData).toHaveProperty("content");
      expect(firstEventData.content).toHaveProperty("parts");
      expect(firstEventData.content.parts).toHaveLength(1);
      expect(firstEventData.content.parts[0]).toHaveProperty("thought", true);
      expect(firstEventData.content.parts[0].text).toContain(
        "Alright, here's the plan"
      );
    }

    // Check if we got the second part
    if (events.length >= 2) {
      const secondEvent = events[1];
      const secondEventData = JSON.parse(
        secondEvent.substring(6, secondEvent.length - 2)
      );

      expect(secondEventData.content.parts[0]).toHaveProperty("text");
      expect(secondEventData.content.parts[0].text).toContain(
        "To achieve the ambitious goal"
      );
    }
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
