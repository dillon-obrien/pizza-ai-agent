import { v4 as uuidv4 } from "uuid";
import { Kernel } from "./semantic-kernel/kernel";
import { AzureOpenAIService } from "./semantic-kernel/connectors";
import {
  ChatCompletionAgent,
  ChatThread,
  ChatMessage,
} from "./semantic-kernel/agents";
import { PizzaApiPlugin } from "./semantic-kernel/plugins/pizza-api-plugin";

export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface FunctionResult {
  name: string;
  result: string;
}

export interface AgentMessage {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  functionCalls?: FunctionCall[];
  functionResults?: FunctionResult[];
  authorName?: string;
}

// Store active threads in memory
const activeThreads: Record<string, ChatThread> = {};

/**
 * Agent Orchestrator using Semantic Kernel
 */
export class SemanticKernelAgentOrchestrator {
  private menuAgent: ChatCompletionAgent;
  private orderAgent: ChatCompletionAgent;
  private kernel: Kernel;

  constructor() {
    // Initialize the kernel with Azure OpenAI service
    this.kernel = Kernel.builder()
      .withAIService(
        new AzureOpenAIService(
          process.env.AZURE_OPENAI_API_KEY || "",
          process.env.AZURE_OPENAI_ENDPOINT || "",
          process.env.AZURE_OPENAI_DEPLOYMENT_NAME || ""
        )
      )
      .build();

    // Add the Pizza API plugin
    this.kernel.getPlugins().addPlugin(new PizzaApiPlugin());

    // Initialize menu agent
    this.menuAgent = new ChatCompletionAgent({
      name: "MenuAgent",
      instructions:
        "You are a specialist in pizza restaurant menus. Your role is to help customers understand the menu options, ingredients, and pricing. Use the Pizza API to get accurate and up-to-date information about available pizzas and toppings. Be informative, friendly, and helpful when discussing menu items.",
      kernel: this.kernel,
    });

    // Initialize order agent
    this.orderAgent = new ChatCompletionAgent({
      name: "OrderAgent",
      instructions:
        "You are a specialist in handling pizza restaurant orders. Your role is to help customers create and manage their orders using the Pizza API. You can help customers place new orders, check order status, and cancel orders if needed.",
      kernel: this.kernel,
    });
  }

  /**
   * Process a message with the appropriate agent
   */
  async processMessage(
    message: string,
    threadId?: string
  ): Promise<{ response: AgentMessage; thread: ChatThread }> {
    // Get or create a thread
    let thread: ChatThread;
    if (threadId && activeThreads[threadId]) {
      thread = activeThreads[threadId];
    } else {
      thread = new ChatThread(uuidv4());
      activeThreads[thread.id] = thread;
    }

    // Determine which agent should handle this message
    const agent = this.selectAgent(message);

    // Process the message with the selected agent
    const agentResponse = await agent.processMessage(message, thread);

    // Convert to the expected AgentMessage format
    const response: AgentMessage = {
      id: agentResponse.id,
      content: agentResponse.content,
      role: agentResponse.role as "assistant", // Type assertion since roles are compatible
      authorName: agent.name,
    };

    // Add function calls and results if present
    if (agentResponse.functionCall) {
      response.functionCalls = [
        {
          name: agentResponse.functionCall.name,
          arguments: agentResponse.functionCall.arguments,
        },
      ];
    }

    if (agentResponse.functionResult) {
      response.functionResults = [
        {
          name: agentResponse.functionResult.name,
          result: agentResponse.functionResult.result,
        },
      ];
    }

    return { response, thread };
  }

  /**
   * Delete a thread
   */
  deleteThread(threadId: string): boolean {
    if (activeThreads[threadId]) {
      delete activeThreads[threadId];
      return true;
    }
    return false;
  }

  /**
   * Select the appropriate agent based on the message content
   */
  private selectAgent(message: string): ChatCompletionAgent {
    const lowerMessage = message.toLowerCase();

    // Order-related terms
    const orderTerms = [
      "order",
      "place order",
      "new order",
      "cancel",
      "status",
      "my orders",
      "track",
      "delivery",
    ];

    // Menu-related terms
    const menuTerms = [
      "menu",
      "pizza",
      "pizzas",
      "topping",
      "toppings",
      "price",
      "ingredient",
      "ingredients",
      "option",
      "options",
      "vegetarian",
    ];

    // Count matches for each category
    let orderScore = 0;
    let menuScore = 0;

    orderTerms.forEach((term) => {
      if (lowerMessage.includes(term)) orderScore++;
    });

    menuTerms.forEach((term) => {
      if (lowerMessage.includes(term)) menuScore++;
    });

    // Select the agent with the higher score
    return orderScore > menuScore ? this.orderAgent : this.menuAgent;
  }
}
