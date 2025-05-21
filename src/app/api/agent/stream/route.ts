import { NextRequest } from "next/server";
import { AgentOrchestrator } from "@/lib/agent-service";

// Initialize the agent orchestrator
const agentOrchestrator = new AgentOrchestrator();

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  console.log("=== STREAM API CALLED ===");

  // Create a new readable stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const requestData = await request.json();
        const { message, threadId } = requestData;

        if (!message) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                error: "Message is required",
                type: "error",
              })
            )
          );
          controller.close();
          return;
        }

        console.log("Processing streaming agent request:", {
          message,
          threadId,
        });

        // Send initial response
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              content: "Thinking...",
              type: "init",
            })
          )
        );

        // Process the message with the agent
        const { response, thread } = await agentOrchestrator.processMessage(
          message,
          threadId
        );

        // Send thread ID
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              threadId: thread.id,
              type: "metadata",
            })
          )
        );

        // If there are function calls, emit them
        if (response.functionCalls && response.functionCalls.length > 0) {
          for (const functionCall of response.functionCalls) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  name: functionCall.name,
                  arguments: functionCall.arguments,
                  type: "functionCall",
                })
              )
            );
            await new Promise((resolve) => setTimeout(resolve, 100)); // Add a small delay
          }
        }

        // If there are function results, emit them
        if (response.functionResults && response.functionResults.length > 0) {
          for (const functionResult of response.functionResults) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  name: functionResult.name,
                  result: functionResult.result,
                  type: "functionResult",
                })
              )
            );
            await new Promise((resolve) => setTimeout(resolve, 100)); // Add a small delay
          }
        }

        // Split the response content into chunks to simulate streaming
        const content = response.content;
        const words = content.split(" ");

        let streamedContent = response.authorName
          ? `[${response.authorName}] `
          : "";

        for (let i = 0; i < words.length; i += 3) {
          const chunk = words.slice(i, i + 3).join(" ");
          streamedContent += chunk + " ";

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                content: streamedContent.trim(),
                type: "content",
              })
            )
          );

          // Add a slight delay to simulate typing
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Signal completion
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              type: "done",
            })
          )
        );
      } catch (error: any) {
        console.error("Error in streaming API:", error);
        controller.enqueue(
          encoder.encode(
            JSON.stringify({
              error: error.message || "An error occurred",
              type: "error",
            })
          )
        );
      } finally {
        console.log("=== STREAM CLOSED ===");
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
