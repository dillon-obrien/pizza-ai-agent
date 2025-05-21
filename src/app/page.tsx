import { AgentChatInterface } from "@/components/agent-chat-interface";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Azure AI Agent Demo</h1>
          <p className="text-muted-foreground">
            A simple integration with Azure OpenAI using Azure AI Agent and
            Semantic Kernel
          </p>
        </div>
        <AgentChatInterface />
      </div>
    </div>
  );
}
