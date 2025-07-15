import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomePage(): React.JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to AI Agent Chat
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Chat with powerful AI agents powered by Google Gemini. Experience
            intelligent conversations with real-time streaming responses.
          </p>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Start a conversation with our AI agent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" size="lg" asChild>
              <a href="/chat">Start Chat</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
