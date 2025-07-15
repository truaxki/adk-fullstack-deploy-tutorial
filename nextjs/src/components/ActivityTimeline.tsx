"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  FileText,
  Zap,
  Globe,
  Code,
  CheckCircle,
  Clock,
  Link,
} from "lucide-react";

// Define types for different event data structures
interface FunctionCallData {
  type: "functionCall";
  name: string;
  args: Record<string, unknown>;
  id?: string;
}

interface FunctionResponseData {
  type: "functionResponse";
  name: string;
  response: unknown;
  id?: string;
}

interface TextData {
  type: "text";
  content: string;
}

interface SourcesData {
  type: "sources";
  content: Record<string, { title: string; url: string }>;
}

type EventData =
  | FunctionCallData
  | FunctionResponseData
  | TextData
  | SourcesData
  | string
  | Record<string, unknown>
  | unknown[];

export interface ProcessedEvent {
  title: string;
  data: EventData;
}

interface ActivityTimelineProps {
  processedEvents: ProcessedEvent[];
  isLoading: boolean;
  websiteCount: number;
}

export function ActivityTimeline({
  processedEvents,
  isLoading,
  websiteCount,
}: ActivityTimelineProps): React.JSX.Element {
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);

  const formatEventData = (data: EventData): string => {
    if (typeof data === "string") {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => JSON.stringify(item, null, 2)).join("\n");
    }

    if (typeof data === "object" && data !== null) {
      if ("type" in data) {
        switch (data.type) {
          case "functionCall":
            const callData = data as FunctionCallData;
            return `Calling function: ${
              callData.name
            }\nArguments: ${JSON.stringify(callData.args, null, 2)}`;
          case "functionResponse":
            const respData = data as FunctionResponseData;
            return `Function ${respData.name} response: ${JSON.stringify(
              respData.response,
              null,
              2
            )}`;
          case "text":
            return (data as TextData).content;
          case "sources":
            const sources = (data as SourcesData).content;
            return Object.entries(sources)
              .map(([key, value]) => `${key}: ${value.title} (${value.url})`)
              .join("\n");
          default:
            return JSON.stringify(data, null, 2);
        }
      }
      return JSON.stringify(data, null, 2);
    }

    return String(data);
  };

  // Get appropriate icon for event type
  const getEventIcon = (title: string) => {
    if (title.includes("Search") || title.includes("search")) {
      return <Search className="h-3 w-3" />;
    }
    if (title.includes("Function Call")) {
      return <Code className="h-3 w-3" />;
    }
    if (title.includes("Function Response")) {
      return <CheckCircle className="h-3 w-3" />;
    }
    if (title.includes("Research") || title.includes("Section")) {
      return <FileText className="h-3 w-3" />;
    }
    if (title.includes("Sources") || title.includes("Retrieved")) {
      return <Link className="h-3 w-3" />;
    }
    if (title.includes("Enhanced") || title.includes("Planning")) {
      return <Zap className="h-3 w-3" />;
    }
    return <Globe className="h-3 w-3" />;
  };

  // Get enhanced styling for better readability
  const getBadgeStyles = (title: string) => {
    if (title.includes("Function Call")) {
      return "bg-purple-500/20 text-purple-200 border-purple-400/40 font-semibold";
    }
    if (title.includes("Function Response")) {
      return "bg-emerald-500/20 text-emerald-200 border-emerald-400/40 font-semibold";
    }
    if (title.includes("Enhanced Search") || title.includes("Research")) {
      return "bg-blue-500/20 text-blue-200 border-blue-400/40 font-semibold";
    }
    if (title.includes("Research") || title.includes("Section")) {
      return "bg-orange-500/20 text-orange-200 border-orange-400/40 font-semibold";
    }
    if (title.includes("Sources") || title.includes("Retrieved")) {
      return "bg-cyan-500/20 text-cyan-200 border-cyan-400/40 font-semibold";
    }
    if (title.includes("Agent Activity")) {
      return "bg-slate-500/20 text-slate-200 border-slate-400/40 font-semibold";
    }
    return "bg-slate-500/20 text-slate-200 border-slate-400/40 font-semibold";
  };

  // Get color scheme for different event types
  const getEventColors = (title: string) => {
    if (title.includes("Search") || title.includes("search")) {
      return {
        icon: "text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        dot: "bg-blue-400",
      };
    }
    if (title.includes("Function Call")) {
      return {
        icon: "text-purple-400",
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
        dot: "bg-purple-400",
      };
    }
    if (title.includes("Function Response")) {
      return {
        icon: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        dot: "bg-emerald-400",
      };
    }
    if (title.includes("Research") || title.includes("Section")) {
      return {
        icon: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
        dot: "bg-orange-400",
      };
    }
    if (title.includes("Sources") || title.includes("Retrieved")) {
      return {
        icon: "text-cyan-400",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/20",
        dot: "bg-cyan-400",
      };
    }
    return {
      icon: "text-slate-400",
      bg: "bg-slate-500/10",
      border: "border-slate-500/20",
      dot: "bg-slate-400",
    };
  };

  if (processedEvents.length === 0 && !isLoading) {
    return <div></div>; // Return empty div if no events and not loading
  }

  return (
    <div className="w-full">
      <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm shadow-lg">
        {/* Timeline Header */}
        <div className="border-b border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTimelineCollapsed(!isTimelineCollapsed)}
                className="p-1.5 h-auto text-slate-300 hover:text-slate-100 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                {isTimelineCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Activity Timeline
                </h3>
              </div>
              {isLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              )}
            </div>

            <div className="flex items-center gap-2">
              {websiteCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                >
                  {websiteCount} {websiteCount === 1 ? "source" : "sources"}
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="text-xs bg-slate-700/50 text-slate-300 border-slate-600/50"
              >
                {processedEvents.length}{" "}
                {processedEvents.length === 1 ? "event" : "events"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        {!isTimelineCollapsed && (
          <div className="p-4">
            {processedEvents.length > 0 ? (
              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border-slate-700/50">
                  <TabsTrigger
                    value="timeline"
                    className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
                  >
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger
                    value="details"
                    className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
                  >
                    Details
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="timeline" className="mt-4">
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-600 via-slate-500 to-slate-600"></div>

                    <div className="space-y-4">
                      {processedEvents.map((event, index) => {
                        const colors = getEventColors(event.title);

                        return (
                          <div
                            key={index}
                            className="relative flex items-start gap-4"
                          >
                            {/* Timeline dot with icon */}
                            <div
                              className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-xl border-2 ${colors.border} ${colors.bg} shadow-md`}
                            >
                              <div className={`${colors.icon}`}>
                                {getEventIcon(event.title)}
                              </div>
                            </div>

                            {/* Event content */}
                            <div className="flex-1 min-w-0 pb-4">
                              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-200 hover:border-slate-600/50">
                                <div className="flex items-center gap-2 mb-2">
                                  <div
                                    className={`px-2.5 py-1 rounded-md text-xs border ${getBadgeStyles(
                                      event.title
                                    )}`}
                                  >
                                    {event.title}
                                  </div>
                                  <span className="text-xs text-slate-400 font-mono bg-slate-900/50 px-2 py-0.5 rounded">
                                    #{index + 1}
                                  </span>
                                </div>
                                <div className="text-sm text-slate-200 leading-relaxed">
                                  {formatEventData(event.data).substring(
                                    0,
                                    150
                                  )}
                                  {formatEventData(event.data).length > 150 && (
                                    <span className="text-slate-400">...</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="mt-4">
                  <div className="space-y-4">
                    {processedEvents.map((event, index) => {
                      const colors = getEventColors(event.title);

                      return (
                        <div
                          key={index}
                          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-200 hover:border-slate-600/50"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div
                              className={`flex items-center justify-center w-8 h-8 rounded-lg ${colors.bg} ${colors.border} border`}
                            >
                              <div className={`${colors.icon}`}>
                                {getEventIcon(event.title)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className={`px-2.5 py-1 rounded-md text-xs border ${getBadgeStyles(
                                  event.title
                                )}`}
                              >
                                {event.title}
                              </div>
                              <span className="text-xs text-slate-400 font-mono bg-slate-900/50 px-2 py-0.5 rounded">
                                Event #{index + 1}
                              </span>
                            </div>
                          </div>
                          <div className="bg-slate-900/50 border border-slate-700/30 rounded-lg p-3 overflow-hidden">
                            <div className="text-xs text-slate-200 font-mono leading-relaxed break-all overflow-wrap-anywhere max-w-full">
                              {formatEventData(event.data)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700/50">
                    <Clock className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="text-sm text-slate-400">
                    {isLoading ? "Waiting for events..." : "No events yet"}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
