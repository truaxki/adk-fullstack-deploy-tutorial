/**
 * Unit tests for Agent Engine JSON line processing
 * Tests the frontend logic that handles complete JSON lines from the backend
 */

describe("Agent Engine JSON Line Processing", () => {
  // Mock the stream processor
  const mockProcessSseEventData = jest.fn();

  // Mock the debug logger
  const mockCreateDebugLog = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Define interface for processed parts
  interface ProcessedPart {
    text: string;
    thought?: boolean;
  }

  // Simulate the processCompleteJsonLines method
  const simulateJsonLineProcessing = (buffer: string): ProcessedPart[] => {
    const sentParts = new Set<string>();
    const foundParts: ProcessedPart[] = [];

    // Hash function (matches the actual implementation)
    const hashPart = (part: { text?: string; thought?: boolean }) => {
      const textPreview = part.text?.substring(0, 100) || "";
      const thought = part.thought || false;
      return `${textPreview}-${thought}-${textPreview.length}`;
    };

    // Split buffer into lines and process complete lines
    const lines = buffer.split("\n");

    // Process all complete lines (all but the last, which might be incomplete)
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const jsonData = JSON.parse(line);

        // Process each part in the JSON data
        if (jsonData.content?.parts && Array.isArray(jsonData.content.parts)) {
          for (const part of jsonData.content.parts) {
            if (part.text && typeof part.text === "string") {
              const partHash = hashPart(part);

              if (!sentParts.has(partHash)) {
                foundParts.push(part);
                mockProcessSseEventData(line); // Simulate processing
                sentParts.add(partHash);
                break; // Only process one part per line to maintain order
              }
            }
          }
        }
      } catch (error) {
        mockCreateDebugLog(
          "JSON PARSE ERROR",
          `Failed to parse line: ${line}`,
          error
        );
      }
    }

    return foundParts;
  };

  describe("Complete JSON Line Processing", () => {
    it("should process complete JSON lines with thought and response parts", () => {
      const buffer = `{"content": {"parts": [{"thought": true, "text": "I'm thinking..."}]}, "author": "goal_planning_agent"}
{"content": {"parts": [{"text": "Here is my response"}]}, "author": "goal_planning_agent"}
`;

      const foundParts = simulateJsonLineProcessing(buffer);

      expect(foundParts).toHaveLength(2);
      expect(foundParts[0]).toEqual({
        thought: true,
        text: "I'm thinking...",
      });
      expect(foundParts[1]).toEqual({
        text: "Here is my response",
      });

      // Should call SSE processor for each part
      expect(mockProcessSseEventData).toHaveBeenCalledTimes(2);
    });

    it("should handle partial lines in buffer correctly", () => {
      const buffer = `{"content": {"parts": [{"thought": true, "text": "Complete line"}]}, "author": "goal_planning_agent"}
{"content": {"parts": [{"text": "Incomplete line"}]}, "au`; // Incomplete line

      const foundParts = simulateJsonLineProcessing(buffer);

      // Should only process the complete line
      expect(foundParts).toHaveLength(1);
      expect(foundParts[0]).toEqual({
        thought: true,
        text: "Complete line",
      });

      expect(mockProcessSseEventData).toHaveBeenCalledTimes(1);
    });

    it("should not process duplicate parts", () => {
      const buffer = `{"content": {"parts": [{"text": "Same content"}]}, "author": "goal_planning_agent"}
{"content": {"parts": [{"text": "Same content"}]}, "author": "goal_planning_agent"}
`;

      const foundParts = simulateJsonLineProcessing(buffer);

      // Should only process the first occurrence
      expect(foundParts).toHaveLength(1);
      expect(foundParts[0]).toEqual({
        text: "Same content",
      });

      expect(mockProcessSseEventData).toHaveBeenCalledTimes(1);
    });

    it("should handle malformed JSON lines gracefully", () => {
      const buffer = `{"invalid": "json"
{"content": {"parts": [{"text": "Valid content"}]}, "author": "goal_planning_agent"}
`;

      const foundParts = simulateJsonLineProcessing(buffer);

      // Should skip invalid JSON and process valid line
      expect(foundParts).toHaveLength(1);
      expect(foundParts[0]).toEqual({
        text: "Valid content",
      });

      expect(mockProcessSseEventData).toHaveBeenCalledTimes(1);
      expect(mockCreateDebugLog).toHaveBeenCalledWith(
        "JSON PARSE ERROR",
        'Failed to parse line: {"invalid": "json"',
        expect.any(Error)
      );
    });

    it("should handle multiple parts per line but only process first", () => {
      const buffer = `{"content": {"parts": [{"thought": true, "text": "First part"}, {"text": "Second part in same line"}]}, "author": "goal_planning_agent"}
`;

      const foundParts = simulateJsonLineProcessing(buffer);

      // Should only process the first part to maintain order
      expect(foundParts).toHaveLength(1);
      expect(foundParts[0]).toEqual({
        thought: true,
        text: "First part",
      });

      expect(mockProcessSseEventData).toHaveBeenCalledTimes(1);
    });

    it("should handle empty lines correctly", () => {
      const buffer = `{"content": {"parts": [{"text": "First line"}]}, "author": "goal_planning_agent"}

{"content": {"parts": [{"text": "Third line"}]}, "author": "goal_planning_agent"}
`;

      const foundParts = simulateJsonLineProcessing(buffer);

      expect(foundParts).toHaveLength(2);
      expect(foundParts[0]).toEqual({
        text: "First line",
      });
      expect(foundParts[1]).toEqual({
        text: "Third line",
      });

      expect(mockProcessSseEventData).toHaveBeenCalledTimes(2);
    });

    it("should handle complex nested JSON structures", () => {
      const buffer = `{"content": {"parts": [{"thought": true, "text": "Complex \\"quoted\\" content with {nested: objects}"}]}, "author": "goal_planning_agent"}
`;

      const foundParts = simulateJsonLineProcessing(buffer);

      expect(foundParts).toHaveLength(1);
      expect(foundParts[0]).toEqual({
        thought: true,
        text: 'Complex "quoted" content with {nested: objects}',
      });

      expect(mockProcessSseEventData).toHaveBeenCalledTimes(1);
    });

    it("should skip parts without text", () => {
      const buffer = `{"content": {"parts": [{"thought": true}, {"text": "Valid part"}, {"invalidPart": "no text"}]}, "author": "goal_planning_agent"}
`;

      const foundParts = simulateJsonLineProcessing(buffer);

      // Should only find the part with valid text (and only process first due to break)
      expect(foundParts).toHaveLength(1);
      expect(foundParts[0]).toEqual({
        text: "Valid part",
      });

      expect(mockProcessSseEventData).toHaveBeenCalledTimes(1);
    });
  });

  describe("Backend Response Simulation", () => {
    it("should simulate typical Agent Engine backend response flow", () => {
      // Simulate what the backend actually sends (multiple chunks arriving)
      const chunks = [
        '{"content": {"parts": [{"thought": true, "text": "Let me think about this request..."}]}, "author": "goal_planning_agent"}\n',
        '{"content": {"parts": [{"text": "Based on your request, here\'s my response:\\n\\n## Analysis\\nThis is a detailed response."}]}, "author": "goal_planning_agent"}\n',
        '{"usage_metadata": {"total_token_count": 150}, "invocation_id": "test-123", "author": "goal_planning_agent"}\n',
      ];

      let buffer = "";
      const allFoundParts: ProcessedPart[] = [];

      // Simulate chunks arriving and being processed
      for (const chunk of chunks) {
        buffer += chunk;
        const foundParts = simulateJsonLineProcessing(buffer);
        allFoundParts.push(...foundParts);

        // Clear processed lines from buffer (simulate frontend behavior)
        const lines = buffer.split("\n");
        buffer = lines[lines.length - 1]; // Keep incomplete line
      }

      // Should have processed both content parts (metadata has no text)
      expect(allFoundParts).toHaveLength(2);
      expect(allFoundParts[0]).toEqual({
        thought: true,
        text: "Let me think about this request...",
      });
      expect(allFoundParts[1]).toEqual({
        text: "Based on your request, here's my response:\n\n## Analysis\nThis is a detailed response.",
      });
    });
  });

  describe("Part Hashing for Duplicate Detection", () => {
    it("should generate consistent hashes for identical parts", () => {
      const hashPart = (part: { text?: string; thought?: boolean }) => {
        const textPreview = part.text?.substring(0, 100) || "";
        const thought = part.thought || false;
        return `${textPreview}-${thought}-${textPreview.length}`;
      };

      const part1 = { text: "Same content", thought: true };
      const part2 = { text: "Same content", thought: true };
      const part3 = { text: "Different content", thought: true };

      expect(hashPart(part1)).toBe(hashPart(part2));
      expect(hashPart(part1)).not.toBe(hashPart(part3));
    });

    it("should distinguish between thought and non-thought parts with same text", () => {
      const hashPart = (part: { text?: string; thought?: boolean }) => {
        const textPreview = part.text?.substring(0, 100) || "";
        const thought = part.thought || false;
        return `${textPreview}-${thought}-${textPreview.length}`;
      };

      const thoughtPart = { text: "Same text", thought: true };
      const responsePart = { text: "Same text", thought: false };

      expect(hashPart(thoughtPart)).not.toBe(hashPart(responsePart));
    });
  });
});
