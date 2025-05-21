import { v4 as uuidv4 } from "uuid";
import { PizzaApiService, OrderItem } from "./pizza-api-service";

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
const activeThreads: Record<string, AgentThread> = {};

// Agent thread for maintaining conversation history and state
export class AgentThread {
  public id: string;
  public messages: AgentMessage[];

  constructor(id?: string) {
    this.id = id || uuidv4();
    this.messages = [];
  }

  addMessage(message: AgentMessage): void {
    this.messages.push(message);
  }

  getHistory(): AgentMessage[] {
    return [...this.messages];
  }
}

// Base agent class
export abstract class Agent {
  public name: string;
  public instructions: string;

  constructor(name: string, instructions: string) {
    this.name = name;
    this.instructions = instructions;
  }

  abstract processMessage(
    message: string,
    thread: AgentThread
  ): Promise<AgentMessage>;
}

// Menu specialist agent
export class MenuAgent extends Agent {
  private pizzaApiService: PizzaApiService;

  constructor() {
    super(
      "MenuAgent",
      "You are a specialist in pizza restaurant menus. Your role is to help customers understand the menu options, ingredients, and pricing. Use the Pizza API to get accurate and up-to-date information about available pizzas and toppings. Be informative, friendly, and helpful when discussing menu items."
    );
    this.pizzaApiService = new PizzaApiService();
  }

  async processMessage(
    message: string,
    thread: AgentThread
  ): Promise<AgentMessage> {
    const functionCalls: FunctionCall[] = [];
    const functionResults: FunctionResult[] = [];
    let responseContent = "";

    // Analyze message to determine intent
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("menu") ||
      lowerMessage.includes("pizzas") ||
      lowerMessage.includes("what pizzas") ||
      lowerMessage.includes("list pizzas")
    ) {
      // Get menu information
      functionCalls.push({
        name: "get_pizzas",
        arguments: {},
      });

      try {
        const pizzas = await this.pizzaApiService.getPizzas();
        const result = this.pizzaApiService.formatPizzaList(pizzas);

        functionResults.push({
          name: "get_pizzas",
          result: result,
        });

        responseContent = `Here's our menu of available pizzas:\n\n${result}\n\nCan I help you with anything specific from our menu?`;
      } catch (error) {
        responseContent =
          "I apologize, but I was unable to retrieve the menu at this time. Please try again later.";
      }
    } else if (
      lowerMessage.includes("topping") ||
      lowerMessage.includes("toppings")
    ) {
      // Get toppings information
      let category: string | undefined = undefined;

      // Check if a specific category is requested
      if (lowerMessage.includes("cheese")) {
        category = "cheese";
      } else if (lowerMessage.includes("meat")) {
        category = "meat";
      } else if (lowerMessage.includes("vegetable")) {
        category = "vegetable";
      }

      functionCalls.push({
        name: "get_toppings",
        arguments: { category },
      });

      try {
        const toppings = await this.pizzaApiService.getToppings(category);
        const result = this.pizzaApiService.formatToppingList(toppings);

        functionResults.push({
          name: "get_toppings",
          result: result,
        });

        responseContent = `Here are the available toppings${
          category ? ` in the ${category} category` : ""
        }:\n\n${result}\n\nWould you like to know about any specific topping?`;
      } catch (error) {
        responseContent =
          "I apologize, but I was unable to retrieve the toppings information at this time. Please try again later.";
      }
    } else if (
      lowerMessage.includes("topping categories") ||
      lowerMessage.includes("categories")
    ) {
      // Get topping categories
      functionCalls.push({
        name: "get_topping_categories",
        arguments: {},
      });

      try {
        const categories = await this.pizzaApiService.getToppingCategories();

        functionResults.push({
          name: "get_topping_categories",
          result: "Topping Categories:\n- " + categories.join("\n- "),
        });

        responseContent = `Here are the topping categories we offer:\n\n- ${categories.join(
          "\n- "
        )}\n\nWould you like to know about the toppings in any specific category?`;
      } catch (error) {
        responseContent =
          "I apologize, but I was unable to retrieve the topping categories at this time. Please try again later.";
      }
    } else {
      // General response about the menu
      try {
        const pizzas = await this.pizzaApiService.getPizzas();
        responseContent = `Welcome to our pizza menu! We offer ${
          pizzas.length
        } different pizzas, including options like ${pizzas
          .slice(0, 3)
          .map((p) => p.name)
          .join(
            ", "
          )}, and more. You can ask me about our pizzas, toppings, or specific items on the menu. What would you like to know?`;
      } catch (error) {
        responseContent =
          "Hello! I can help you with our menu, pizzas, toppings, and ingredients. What would you like to know?";
      }
    }

    return {
      id: uuidv4(),
      content: responseContent,
      role: "assistant",
      functionCalls,
      functionResults,
      authorName: this.name,
    };
  }
}

// Order specialist agent
export class OrderAgent extends Agent {
  private pizzaApiService: PizzaApiService;

  constructor() {
    super(
      "OrderAgent",
      "You are a specialist in handling pizza restaurant orders. Your role is to help customers create and manage their orders using the Pizza API. You can help customers place new orders, check order status, and cancel orders if needed."
    );
    this.pizzaApiService = new PizzaApiService();
  }

  async processMessage(
    message: string,
    thread: AgentThread
  ): Promise<AgentMessage> {
    const functionCalls: FunctionCall[] = [];
    const functionResults: FunctionResult[] = [];
    let responseContent = "";

    // Analyze message to determine intent
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("order") &&
      (lowerMessage.includes("place") ||
        lowerMessage.includes("new") ||
        lowerMessage.includes("create"))
    ) {
      // Attempt to extract order details from message
      const pizzaIds = this.extractPizzaIds(lowerMessage);

      if (pizzaIds.length > 0) {
        // Create order items with default quantity of 1
        const items: OrderItem[] = pizzaIds.map((pizzaId) => ({
          pizzaId,
          quantity: 1,
        }));

        functionCalls.push({
          name: "place_order",
          arguments: { items: JSON.stringify(items) },
        });

        try {
          const order = await this.pizzaApiService.placeOrder(items);
          const result = this.pizzaApiService.formatOrderDetails(order);

          functionResults.push({
            name: "place_order",
            result: result,
          });

          responseContent = `Your order has been placed successfully!\n\n${result}\n\nYour pizza will be ready soon. You can check the status of your order by asking about order ${order.id}.`;
        } catch (error) {
          responseContent =
            "I apologize, but I was unable to place your order at this time. Please try again later.";
        }
      } else {
        // Get available pizzas to help with ordering
        functionCalls.push({
          name: "get_pizzas",
          arguments: {},
        });

        try {
          const pizzas = await this.pizzaApiService.getPizzas();
          const result = this.pizzaApiService.formatPizzaList(pizzas);

          functionResults.push({
            name: "get_pizzas",
            result: result,
          });

          responseContent = `I'd be happy to help you place an order! Here are the pizzas we offer:\n\n${result}\n\nTo place an order, please let me know which pizza(s) you'd like and how many of each.`;
        } catch (error) {
          responseContent =
            "I apologize, but I was unable to retrieve the menu at this time. Please try again later.";
        }
      }
    } else if (
      lowerMessage.includes("status") &&
      lowerMessage.includes("order")
    ) {
      // Check order status
      // Try to extract order ID from message
      const orderId = this.extractOrderId(lowerMessage);

      if (orderId) {
        functionCalls.push({
          name: "get_order_by_id",
          arguments: { orderId },
        });

        try {
          const order = await this.pizzaApiService.getOrderById(orderId);
          const result = this.pizzaApiService.formatOrderDetails(order);

          functionResults.push({
            name: "get_order_by_id",
            result: result,
          });

          responseContent = `Here's the status of your order:\n\n${result}`;
        } catch (error) {
          responseContent =
            "I apologize, but I was unable to find that order. Please check the order ID and try again.";
        }
      } else {
        // Get all orders
        functionCalls.push({
          name: "get_orders",
          arguments: {},
        });

        try {
          const orders = await this.pizzaApiService.getOrders();
          const result = this.pizzaApiService.formatOrderList(orders);

          functionResults.push({
            name: "get_orders",
            result: result,
          });

          if (orders.length > 0) {
            responseContent = `Here are your orders:\n\n${result}\n\nYou can check the status of a specific order by providing the order ID.`;
          } else {
            responseContent =
              "You don't have any active orders at the moment. Would you like to place a new order?";
          }
        } catch (error) {
          responseContent =
            "I apologize, but I was unable to retrieve your orders at this time. Please try again later.";
        }
      }
    } else if (
      lowerMessage.includes("cancel") &&
      lowerMessage.includes("order")
    ) {
      // Cancel order
      const orderId = this.extractOrderId(lowerMessage);

      if (orderId) {
        functionCalls.push({
          name: "cancel_order",
          arguments: { orderId },
        });

        try {
          await this.pizzaApiService.cancelOrder(orderId);

          functionResults.push({
            name: "cancel_order",
            result: `Order ${orderId} has been successfully canceled.`,
          });

          responseContent = `Your order ${orderId} has been successfully canceled. Is there anything else you'd like to do?`;
        } catch (error) {
          responseContent = `I apologize, but I couldn't cancel the order. ${
            error instanceof Error
              ? error.message
              : "Please check the order ID and try again."
          }`;
        }
      } else {
        responseContent =
          "To cancel an order, I need the order ID. Could you please provide the ID of the order you want to cancel?";
      }
    } else if (
      lowerMessage.includes("my orders") ||
      lowerMessage.includes("list orders") ||
      lowerMessage.includes("show orders")
    ) {
      // List all orders
      functionCalls.push({
        name: "get_orders",
        arguments: {},
      });

      try {
        const orders = await this.pizzaApiService.getOrders();
        const result = this.pizzaApiService.formatOrderList(orders);

        functionResults.push({
          name: "get_orders",
          result: result,
        });

        if (orders.length > 0) {
          responseContent = `Here are your orders:\n\n${result}`;
        } else {
          responseContent =
            "You don't have any active orders at the moment. Would you like to place a new order?";
        }
      } catch (error) {
        responseContent =
          "I apologize, but I was unable to retrieve your orders at this time. Please try again later.";
      }
    } else {
      // General response about ordering
      responseContent =
        "I can help you place a new order, check the status of an existing order, or cancel an order. What would you like to do?";
    }

    return {
      id: uuidv4(),
      content: responseContent,
      role: "assistant",
      functionCalls,
      functionResults,
      authorName: this.name,
    };
  }

  // Helper method to extract pizza IDs from a message
  private extractPizzaIds(message: string): string[] {
    const pizzaIds: string[] = [];

    // Simple implementation - in a real system would use more robust parsing
    // Check for pizza IDs in the message
    const idMatches = message.match(/pizza\s+(\d+)/gi);
    if (idMatches) {
      idMatches.forEach((match) => {
        const id = match.replace(/pizza\s+/i, "");
        pizzaIds.push(id);
      });
    }

    // If no explicit IDs found, look for common pizza names
    if (pizzaIds.length === 0) {
      if (message.toLowerCase().includes("margherita")) pizzaIds.push("1");
      if (message.toLowerCase().includes("pepperoni")) pizzaIds.push("2");
      if (message.toLowerCase().includes("vegetarian")) pizzaIds.push("3");
      if (message.toLowerCase().includes("hawaiian")) pizzaIds.push("4");
      if (message.toLowerCase().includes("supreme")) pizzaIds.push("5");
    }

    return pizzaIds;
  }

  // Helper method to extract order ID from a message
  private extractOrderId(message: string): string | null {
    const match = message.match(/order\s+([a-zA-Z0-9-]+)/i);
    return match ? match[1] : null;
  }
}

// Class to handle agent selection and orchestration
export class AgentOrchestrator {
  private menuAgent: MenuAgent;
  private orderAgent: OrderAgent;

  constructor() {
    this.menuAgent = new MenuAgent();
    this.orderAgent = new OrderAgent();
  }

  // Process a message and select the appropriate agent to respond
  async processMessage(
    message: string,
    threadId?: string
  ): Promise<{ response: AgentMessage; thread: AgentThread }> {
    // Get or create a thread
    let thread: AgentThread;
    if (threadId && activeThreads[threadId]) {
      thread = activeThreads[threadId];
    } else {
      thread = new AgentThread();
      activeThreads[thread.id] = thread;
    }

    // Add user message to thread
    const userMessage: AgentMessage = {
      id: uuidv4(),
      content: message,
      role: "user",
    };
    thread.addMessage(userMessage);

    // Determine which agent should handle this message
    const agent = this.selectAgent(message);

    // Process the message with the selected agent
    const response = await agent.processMessage(message, thread);

    // Add agent response to thread
    thread.addMessage(response);

    return { response, thread };
  }

  // Delete a thread
  deleteThread(threadId: string): boolean {
    if (activeThreads[threadId]) {
      delete activeThreads[threadId];
      return true;
    }
    return false;
  }

  // Select the appropriate agent based on the message content
  private selectAgent(message: string): Agent {
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
