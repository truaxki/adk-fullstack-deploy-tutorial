"use client";

import { Button } from "@/components/ui/button";
import { InputForm } from "@/components/InputForm";
import { Bot, Sparkles, Zap, Globe, FileText } from "lucide-react";

interface WelcomeScreenProps {
  handleSubmit: (query: string) => void;
  isLoading: boolean;
  onCancel: () => void;
}

export function WelcomeScreen({
  handleSubmit,
  isLoading,
  onCancel,
}: WelcomeScreenProps): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent"></div>
      <div className="absolute top-10 left-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl"></div>

      {/* Main content card */}
      <div className="w-full max-w-3xl z-10 relative">
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/20 p-8 md:p-12">
          {/* Header section */}
          <div className="text-center space-y-6 mb-8">
            {/* Logo/Icon area */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg border border-emerald-400/30">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <div className="flex gap-1">
                <Sparkles className="h-6 w-6 text-emerald-400 animate-pulse" />
                <Zap className="h-5 w-5 text-blue-400 animate-bounce delay-100" />
                <Globe className="h-4 w-4 text-purple-400 animate-pulse delay-200" />
              </div>
            </div>

            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-100 via-slate-200 to-slate-300 bg-clip-text text-transparent leading-tight">
                AI Research Assistant
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto mt-3 leading-relaxed">
                Powered by Google Gemini
              </p>
            </div>

            <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Transform your questions into comprehensive research reports with
              real-time web search, intelligent analysis, and structured
              insights.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center hover:border-slate-600/50 transition-colors">
              <FileText className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-200 mb-1">
                Research Reports
              </h3>
              <p className="text-xs text-slate-400">
                Comprehensive analysis and insights
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center hover:border-slate-600/50 transition-colors">
              <Globe className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-200 mb-1">
                Web Search
              </h3>
              <p className="text-xs text-slate-400">
                Real-time information gathering
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center hover:border-slate-600/50 transition-colors">
              <Zap className="h-6 w-6 text-purple-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-200 mb-1">
                AI Analysis
              </h3>
              <p className="text-xs text-slate-400">
                Intelligent processing and synthesis
              </p>
            </div>
          </div>

          {/* Input form section */}
          <div className="space-y-4">
            <InputForm
              onSubmit={handleSubmit}
              isLoading={isLoading}
              context="homepage"
            />

            {isLoading && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="text-red-400 hover:text-red-300 border-red-400/30 hover:border-red-400/50 bg-red-950/20 hover:bg-red-950/30 transition-colors"
                >
                  Cancel Research
                </Button>
              </div>
            )}
          </div>

          {/* Example queries */}
          <div className="mt-8 text-center">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Try asking about:
            </h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "Latest AI developments",
                "Climate change solutions",
                "Startup funding trends",
                "Quantum computing breakthroughs",
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => !isLoading && handleSubmit(example)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-slate-200 border border-slate-600/50 hover:border-slate-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
