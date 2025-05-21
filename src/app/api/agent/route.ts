import { NextRequest, NextResponse } from "next/server";
import { SemanticKernelAgentOrchestrator } from "@/lib/semantic-kernel-agent-service";

// Initialize the semantic kernel agent orchestrator
const agentOrchestrator = new SemanticKernelAgentOrchestrator();

/**
 * Process a message with the agent
 */
export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    console.log("Processing agent request:", requestData);

    const { message, threadId } = requestData;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Process the message with the agent
    const { response, thread } = await agentOrchestrator.processMessage(
      message,
      threadId
    );

    return NextResponse.json({
      response: response.content,
      threadId: thread.id,
      functionCalls: response.functionCalls || [],
      functionResults: response.functionResults || [],
      authorName: response.authorName,
    });
  } catch (error: any) {
    console.error("Error in agent API:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}

/**
 * Delete a conversation thread
 */
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const threadId = url.searchParams.get("threadId");

  if (!threadId) {
    return NextResponse.json(
      { error: "Thread ID is required" },
      { status: 400 }
    );
  }

  try {
    const success = agentOrchestrator.deleteThread(threadId);

    if (!success) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in DELETE agent API:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred" },
      { status: 500 }
    );
  }
}
