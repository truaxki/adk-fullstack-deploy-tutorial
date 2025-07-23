/**
 * Unit tests for Agent Engine JSON fragment processing logic
 * Tests the core functionality of parsing and processing JSON fragments
 */

describe("JSON Fragment Processing", () => {
  // Test JSON fragment parsing logic
  describe("JSON Fragment Parsing", () => {
    const simulateJsonFragmentProcessing = (fragments: string[]) => {
      let buffer = "";
      const foundParts: any[] = [];
      const sentParts = new Set<string>();
      let lastProcessedIndex = 0;

      // Simulate the buffer processing logic from connection-manager.ts
      for (const fragment of fragments) {
        buffer += fragment;

        // Look for the parts array start
        const partsMatch = buffer.match(/"parts"\s*:\s*\[/);
        if (!partsMatch) {
          continue;
        }

        const partsStartIndex = partsMatch.index! + partsMatch[0].length;
        const partsContent = buffer.substring(partsStartIndex);

        // Only process new content beyond what we've already processed
        const newContent = partsContent.substring(lastProcessedIndex);
        if (newContent.length === 0) {
          continue;
        }

        // Find complete part objects in the content
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;
        let partStartPos = -1;

        for (let i = lastProcessedIndex; i < partsContent.length; i++) {
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
                  const partHash = `${part.text.substring(0, 100)}-${
                    part.thought
                  }-${part.text.length}`;

                  if (!sentParts.has(partHash)) {
                    foundParts.push(part);
                    sentParts.add(partHash);
                    lastProcessedIndex = i + 1;
                  }
                }
              } catch {
                // Not a valid JSON object, continue
              }
            }
          }
        }
      }

      return foundParts;
    };

    it("should process complete JSON fragments with thought and response parts", () => {
      const fragments = [
        '{"content": {"parts": [{"thought": true, "text": "I\'m thinking..."}]}, "author": "goal_planning_agent"}\n',
        '{"content": {"parts": [{"text": "Here is my response"}]}, "author": "goal_planning_agent"}\n',
      ];

      const foundParts = simulateJsonFragmentProcessing(fragments);

      expect(foundParts).toHaveLength(2);
      expect(foundParts[0]).toEqual({
        thought: true,
        text: "I'm thinking...",
      });
      expect(foundParts[1]).toEqual({
        text: "Here is my response",
      });
    });

    it("should handle partial JSON fragments that need to be assembled", () => {
      const fragments = [
        '{"content": {"parts": [{"thought": true, "text": "Partial',
        ' thought content"}]}, "author": "goal_planning_agent"}\n',
      ];

      const foundParts = simulateJsonFragmentProcessing(fragments);

      expect(foundParts).toHaveLength(1);
      expect(foundParts[0]).toEqual({
        thought: true,
        text: "Partial thought content",
      });
    });

    it("should not process duplicate parts", () => {
      const fragments = [
        '{"content": {"parts": [{"text": "Same content"}]}, "author": "goal_planning_agent"}\n',
        '{"content": {"parts": [{"text": "Same content"}]}, "author": "goal_planning_agent"}\n', // Duplicate
      ];

      const foundParts = simulateJsonFragmentProcessing(fragments);

      expect(foundParts).toHaveLength(1);
      expect(foundParts[0]).toEqual({
        text: "Same content",
      });
    });

    it("should handle malformed JSON gracefully", () => {
      const fragments = [
        '{"invalid": "json"', // Incomplete JSON
        '{"content": {"parts": [{"text": "Valid content"}]}, "author": "goal_planning_agent"}\n',
      ];

      const foundParts = simulateJsonFragmentProcessing(fragments);

      expect(foundParts).toHaveLength(1);
      expect(foundParts[0]).toEqual({
        text: "Valid content",
      });
    });

    it("should handle complex nested JSON structures", () => {
      const fragments = [
        '{"content": {"parts": [{"thought": true, "text": "Complex \\"quoted\\" content with {nested: objects}"}]}, "author": "goal_planning_agent"}\n',
      ];

      const foundParts = simulateJsonFragmentProcessing(fragments);

      expect(foundParts).toHaveLength(1);
      expect(foundParts[0]).toEqual({
        thought: true,
        text: 'Complex "quoted" content with {nested: objects}',
      });
    });

    it("should handle multiple parts in single fragment", () => {
      const fragments = [
        '{"content": {"parts": [{"thought": true, "text": "First part"}, {"text": "Second part"}]}, "author": "goal_planning_agent"}\n',
      ];

      const foundParts = simulateJsonFragmentProcessing(fragments);

      expect(foundParts).toHaveLength(2);
      expect(foundParts[0]).toEqual({
        thought: true,
        text: "First part",
      });
      expect(foundParts[1]).toEqual({
        text: "Second part",
      });
    });

    it("should handle empty or invalid parts", () => {
      const fragments = [
        '{"content": {"parts": [{"thought": true}, {"text": "Valid part"}, {"invalidPart": "no text"}]}, "author": "goal_planning_agent"}\n',
      ];

      const foundParts = simulateJsonFragmentProcessing(fragments);

      // Should only find the part with valid text
      expect(foundParts).toHaveLength(1);
      expect(foundParts[0]).toEqual({
        text: "Valid part",
      });
    });
  });

  describe("Part Hashing for Duplicate Detection", () => {
    it("should generate consistent hashes for identical parts", () => {
      const generateHash = (part: { text?: string; thought?: boolean }) => {
        const textPreview = part.text?.substring(0, 100) || "";
        const thought = part.thought || false;
        return `${textPreview}-${thought}-${textPreview.length}`;
      };

      const part1 = { text: "Same content", thought: true };
      const part2 = { text: "Same content", thought: true };
      const part3 = { text: "Different content", thought: true };

      expect(generateHash(part1)).toBe(generateHash(part2));
      expect(generateHash(part1)).not.toBe(generateHash(part3));
    });

    it("should distinguish between thought and non-thought parts with same text", () => {
      const generateHash = (part: { text?: string; thought?: boolean }) => {
        const textPreview = part.text?.substring(0, 100) || "";
        const thought = part.thought || false;
        return `${textPreview}-${thought}-${textPreview.length}`;
      };

      const thoughtPart = { text: "Same text", thought: true };
      const responsePart = { text: "Same text", thought: false };

      expect(generateHash(thoughtPart)).not.toBe(generateHash(responsePart));
    });
  });
});
