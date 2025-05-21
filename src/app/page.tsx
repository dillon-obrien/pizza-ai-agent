import { AgentChatInterface } from "@/components/agent-chat-interface";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Pizza Ordering System</h1>
          <p className="text-muted-foreground">
            A TypeScript-based intelligent ordering system for pizza with menu
            and order management
          </p>
        </div>
        <AgentChatInterface />
      </div>
    </div>
  );
}
