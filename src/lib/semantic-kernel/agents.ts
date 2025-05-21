import { Kernel } from "./kernel";
import { AIService } from "./connectors";
import { KernelFunction } from "./functions";

/**
 * Represents a message in a chat conversation
 */
export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant" | "function";
  content: string;
  functionCall?: {
    name: string;
    arguments: Record<string, any>;
  };
  functionResult?: {
    name: string;
    result: string;
  };
}

/**
 * A thread of chat messages
 */
export class ChatThread {
  private messages: ChatMessage[];
  public id: string;

  constructor(id: string) {
    this.id = id;
    this.messages = [];
  }

  /**
   * Add a message to the thread
   */
  addMessage(message: ChatMessage): void {
    this.messages.push(message);
  }

  /**
   * Get all messages in the thread
   */
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Get the chat history as a string
   */
  getChatHistory(): string {
    let result = "";
    for (const message of this.messages) {
      result += `${message.role}: ${message.content}\n`;
    }
    return result;
  }
}

/**
 * Base interface for all agents
 */
export interface Agent {
  name: string;
  instructions: string;
  processMessage(message: string, thread: ChatThread): Promise<ChatMessage>;
}

/**
 * A chat completion agent using Semantic Kernel
 */
export class ChatCompletionAgent implements Agent {
  public name: string;
  public instructions: string;
  private kernel: Kernel;
  private aiService: AIService;
  private availableFunctions: KernelFunction[];

  constructor(options: {
    name: string;
    instructions: string;
    kernel: Kernel;
    aiService?: AIService;
  }) {
    this.name = options.name;
    this.instructions = options.instructions;
    this.kernel = options.kernel;
    this.aiService = options.aiService || this.kernel.getAIService()!;
    this.availableFunctions = this.kernel.getPlugins().getFunctions();
  }

  /**
   * Process a message using the agent
   */
  async processMessage(
    message: string,
    thread: ChatThread
  ): Promise<ChatMessage> {
    // Add the user message to the thread
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };
    thread.addMessage(userMessage);

    // Construct the prompt
    const prompt = this.buildPrompt(thread);

    // Get a response from the AI service
    const response = await this.aiService.completePrompt(prompt);

    // Parse any function calls
    const functionCall = this.extractFunctionCall(response);

    // Create the assistant message
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: functionCall ? "" : response,
      functionCall: functionCall,
    };

    // Add the assistant message to the thread
    thread.addMessage(assistantMessage);

    // Execute function call if present
    if (functionCall) {
      const functionResult = await this.executeFunctionCall(functionCall);

      // Add function result to thread
      const functionResultMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "function",
        content: functionResult.result,
        functionResult: functionResult,
      };

      thread.addMessage(functionResultMessage);

      // Process again with function result
      return this.processMessage("", thread);
    }

    return assistantMessage;
  }

  /**
   * Build a prompt for the AI service
   */
  private buildPrompt(thread: ChatThread): string {
    const messages = thread.getMessages();
    let prompt = `System: ${this.instructions}\n\n`;

    for (const message of messages) {
      prompt += `${
        message.role.charAt(0).toUpperCase() + message.role.slice(1)
      }: ${message.content}\n`;

      if (message.functionCall) {
        prompt += `Function Call: ${message.functionCall.name}(${JSON.stringify(
          message.functionCall.arguments
        )})\n`;
      }

      if (message.functionResult) {
        prompt += `Function Result: ${message.functionResult.result}\n`;
      }
    }

    // Add available functions
    if (this.availableFunctions.length > 0) {
      prompt += "\nAvailable functions:\n";

      for (const func of this.availableFunctions) {
        prompt += `- ${func.name}: ${func.description}\n`;
      }
    }

    prompt += "\nAssistant: ";
    return prompt;
  }

  /**
   * Extract a function call from the AI response
   */
  private extractFunctionCall(
    response: string
  ): ChatMessage["functionCall"] | undefined {
    // Simple regex-based extraction - could be more sophisticated
    const functionCallRegex = /function\s*:\s*(\w+)\s*\(\s*(\{.*\})\s*\)/i;
    const match = response.match(functionCallRegex);

    if (match && match.length >= 3) {
      try {
        const functionName = match[1];
        const argumentsJson = match[2];
        const args = JSON.parse(argumentsJson);

        return {
          name: functionName,
          arguments: args,
        };
      } catch (error) {
        console.error("Failed to parse function call:", error);
      }
    }

    return undefined;
  }

  /**
   * Execute a function call
   */
  private async executeFunctionCall(
    functionCall: ChatMessage["functionCall"]
  ): Promise<NonNullable<ChatMessage["functionResult"]>> {
    if (!functionCall) {
      throw new Error("No function call provided");
    }

    const { name, arguments: args } = functionCall;

    // Find the function
    const func = this.kernel
      .getPlugins()
      .getFunctions()
      .find((f: KernelFunction) => f.name === name);

    if (!func) {
      return {
        name,
        result: `Error: Function '${name}' not found.`,
      };
    }

    try {
      // Create context with arguments
      const context = {
        variables: { ...args },
        results: [],
      };

      // Execute the function
      const result = await func.execute(context);

      // Get the result
      const resultText =
        result.results.length > 0
          ? result.results[result.results.length - 1]
          : JSON.stringify(result.variables);

      return {
        name,
        result: resultText,
      };
    } catch (error) {
      console.error(`Error executing function '${name}':`, error);
      return {
        name,
        result: `Error executing function '${name}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  }
}
