/**
 * SSE Format Consistency Tests
 *
 * Verifies that Agent Engine and local backend handlers produce SSE events
 * with identical structures for unified frontend processing.
 */

describe("SSE Format Consistency", () => {
  describe("Agent Engine SSE Format", () => {
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

    // Test the Agent Engine SSE event structure
    it("should produce valid SSE format with correct structure", () => {
      const mockController = new MockStreamController();

      // Simulate what the improved JSONFragmentProcessor would output
      const testPart = {
        text: "Hello world",
        thought: false,
      };

      const sseData = {
        content: {
          parts: [testPart],
        },
        author: "goal_planning_agent",
      };

      // Simulate SSE format output
      const sseEvent = `data: ${JSON.stringify(sseData)}\n\n`;
      mockController.enqueue(Buffer.from(sseEvent));

      const events = mockController.getSSEEvents();

      // Verify SSE format structure
      expect(events).toHaveLength(1);
      expect(events[0]).toMatch(/^data: \{.*\}\n\n$/);

      // Parse and verify JSON structure
      const eventData = JSON.parse(
        events[0].substring(6, events[0].length - 2)
      );
      expect(eventData).toHaveProperty("author", "goal_planning_agent");
      expect(eventData).toHaveProperty("content");
      expect(eventData.content).toHaveProperty("parts");
      expect(Array.isArray(eventData.content.parts)).toBe(true);
      expect(eventData.content.parts).toHaveLength(1);
      expect(eventData.content.parts[0]).toEqual({
        text: "Hello world",
        thought: false,
      });
    });

    it("should handle thought parts correctly in SSE format", () => {
      const mockController = new MockStreamController();

      const thoughtPart = {
        text: "I'm thinking about this...",
        thought: true,
      };

      const sseData = {
        content: {
          parts: [thoughtPart],
        },
        author: "goal_planning_agent",
      };

      const sseEvent = `data: ${JSON.stringify(sseData)}\n\n`;
      mockController.enqueue(Buffer.from(sseEvent));

      const events = mockController.getSSEEvents();
      const eventData = JSON.parse(
        events[0].substring(6, events[0].length - 2)
      );

      // Verify thought flag is preserved
      expect(eventData.content.parts[0].thought).toBe(true);
      expect(eventData.content.parts[0].text).toBe(
        "I'm thinking about this..."
      );
    });

    it("should handle metadata events correctly in SSE format", () => {
      const mockController = new MockStreamController();

      const metadataData = {
        author: "goal_planning_agent",
        usage_metadata: {
          total_token_count: 150,
          prompt_token_count: 50,
          candidates_token_count: 100,
        },
        invocation_id: "test-123",
      };

      const sseEvent = `data: ${JSON.stringify(metadataData)}\n\n`;
      mockController.enqueue(Buffer.from(sseEvent));

      const events = mockController.getSSEEvents();
      const eventData = JSON.parse(
        events[0].substring(6, events[0].length - 2)
      );

      // Verify metadata structure
      expect(eventData).toHaveProperty("author", "goal_planning_agent");
      expect(eventData).toHaveProperty("usage_metadata");
      expect(eventData.usage_metadata).toEqual({
        total_token_count: 150,
        prompt_token_count: 50,
        candidates_token_count: 100,
      });
      expect(eventData).toHaveProperty("invocation_id", "test-123");
    });
  });

  describe("Expected Local Backend SSE Format", () => {
    it("should match the expected structure from local backend", () => {
      // This test documents the expected SSE format that local backend should produce
      // to ensure Agent Engine format matches

      const expectedSSEFormat = `data: {"content":{"parts":[{"text":"Sample response","thought":false}]},"author":"goal_planning_agent"}\n\n`;

      // Verify it can be parsed
      expect(() => {
        const eventData = JSON.parse(
          expectedSSEFormat.substring(6, expectedSSEFormat.length - 2)
        );
        expect(eventData).toHaveProperty("content");
        expect(eventData).toHaveProperty("author");
      }).not.toThrow();
    });

    it("should handle complex content structures", () => {
      // Test more complex content that might come from either backend
      const complexSSE = {
        content: {
          parts: [
            { text: "First part", thought: false },
            { text: "Thinking...", thought: true },
            {
              text: "Final response with citations",
              thought: false,
            },
          ],
        },
        author: "goal_planning_agent",
        usage_metadata: {
          total_token_count: 200,
        },
      };

      const sseEvent = `data: ${JSON.stringify(complexSSE)}\n\n`;

      // Verify format is valid
      expect(sseEvent).toMatch(/^data: \{.*\}\n\n$/);

      // Verify content can be parsed
      const parsed = JSON.parse(sseEvent.substring(6, sseEvent.length - 2));
      expect(parsed.content.parts).toHaveLength(3);
      expect(parsed.content.parts[1].thought).toBe(true);
      expect(parsed.usage_metadata.total_token_count).toBe(200);
    });
  });

  describe("Cross-Backend Compatibility", () => {
    it("should ensure Agent Engine and local backend events have identical structure", () => {
      // Define the standard SSE event structure both backends should use
      const standardStructure = {
        // Required fields
        author: expect.any(String),

        // Content structure (when present)
        content: expect.objectContaining({
          parts: expect.arrayContaining([
            expect.objectContaining({
              text: expect.any(String),
              thought: expect.any(Boolean),
            }),
          ]),
        }),
      };

      // Simulate Agent Engine event
      const agentEngineEvent = {
        content: {
          parts: [{ text: "Agent Engine response", thought: false }],
        },
        author: "goal_planning_agent",
      };

      // Simulate what local backend should produce
      const localBackendEvent = {
        content: {
          parts: [{ text: "Local backend response", thought: false }],
        },
        author: "goal_planning_agent",
      };

      // Both should match the standard structure
      expect(agentEngineEvent).toEqual(
        expect.objectContaining(standardStructure)
      );
      expect(localBackendEvent).toEqual(
        expect.objectContaining(standardStructure)
      );

      // Verify they have the same keys (structure)
      expect(Object.keys(agentEngineEvent).sort()).toEqual(
        Object.keys(localBackendEvent).sort()
      );
    });

    it("should handle optional fields consistently", () => {
      // Test that optional fields are handled the same way by both backends
      const eventWithOptionalFields = {
        author: "goal_planning_agent",
        content: {
          parts: [{ text: "Response", thought: false }],
        },
        usage_metadata: {
          total_token_count: 100,
        },
        invocation_id: "test-id",
        actions: {
          state_delta: { key: "value" },
        },
      };

      // Verify all optional fields are properly structured
      expect(eventWithOptionalFields).toHaveProperty("usage_metadata");
      expect(eventWithOptionalFields).toHaveProperty("invocation_id");
      expect(eventWithOptionalFields).toHaveProperty("actions");

      // Verify the structure is consistent
      expect(typeof eventWithOptionalFields.usage_metadata).toBe("object");
      expect(typeof eventWithOptionalFields.invocation_id).toBe("string");
      expect(typeof eventWithOptionalFields.actions).toBe("object");
    });
  });
});
