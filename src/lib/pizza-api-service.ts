import { v4 as uuidv4 } from "uuid";

// Types for API responses
export interface Pizza {
  id: string;
  name: string;
  description: string;
  price: number;
  toppings: Topping[];
}

export interface Topping {
  id: string;
  name: string;
  category: string;
  price: number;
}

export interface OrderItem {
  pizzaId: string;
  quantity: number;
  extraToppingIds?: string[];
}

export interface OrderRequest {
  userId: string;
  items: OrderItem[];
}

export interface OrderResponse {
  id: string;
  status: "pending" | "in-preparation" | "ready" | "completed" | "cancelled";
  items: {
    quantity: number;
    pizza: Pizza;
    extraToppings?: Topping[];
  }[];
  total: number;
  createdAt: string;
  estimatedCompletionTime?: string;
}

export class PizzaApiService {
  private apiBaseUrl = "https://func-pizza-api-vqqlxwmln5lf4.azurewebsites.net";
  private userId: string;

  constructor() {
    // Get the user ID from environment variables or generate a temporary one
    this.userId =
      process.env.PIZZA_ID || "8aff3a4a-912f-43c5-a702-7170f53bbbc1";
  }

  // Get all available pizzas
  async getPizzas(): Promise<Pizza[]> {
    const response = await fetch(`${this.apiBaseUrl}/api/pizzas`);

    if (!response.ok) {
      throw new Error(`Failed to fetch pizzas: ${response.statusText}`);
    }

    return response.json();
  }

  // Get a specific pizza by ID
  async getPizzaById(pizzaId: string): Promise<Pizza> {
    const response = await fetch(`${this.apiBaseUrl}/api/pizzas/${pizzaId}`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch pizza ${pizzaId}: ${response.statusText}`
      );
    }

    return response.json();
  }

  // Get all toppings, optionally filtered by category
  async getToppings(category?: string): Promise<Topping[]> {
    let url = `${this.apiBaseUrl}/api/toppings`;
    if (category) {
      url += `?category=${category}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch toppings: ${response.statusText}`);
    }

    return response.json();
  }

  // Get all topping categories
  async getToppingCategories(): Promise<string[]> {
    const response = await fetch(`${this.apiBaseUrl}/api/toppings/categories`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch topping categories: ${response.statusText}`
      );
    }

    return response.json();
  }

  // Get all orders for the current user
  async getOrders(status?: string, last?: string): Promise<OrderResponse[]> {
    let url = `${this.apiBaseUrl}/api/orders?userId=${this.userId}`;

    if (status) {
      url += `&status=${status}`;
    }

    if (last) {
      url += `&last=${last}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.statusText}`);
    }

    return response.json();
  }

  // Get a specific order by ID
  async getOrderById(orderId: string): Promise<OrderResponse> {
    const response = await fetch(`${this.apiBaseUrl}/api/orders/${orderId}`);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch order ${orderId}: ${response.statusText}`
      );
    }

    return response.json();
  }

  // Place a new order
  async placeOrder(items: OrderItem[]): Promise<OrderResponse> {
    const orderRequest: OrderRequest = {
      userId: this.userId,
      items,
    };

    const response = await fetch(`${this.apiBaseUrl}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderRequest),
    });

    if (!response.ok) {
      throw new Error(`Failed to place order: ${response.statusText}`);
    }

    return response.json();
  }

  // Cancel an order
  async cancelOrder(orderId: string): Promise<void> {
    const response = await fetch(
      `${this.apiBaseUrl}/api/orders/${orderId}?userId=${this.userId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error(
          "This order cannot be canceled. It may have already started preparation."
        );
      } else if (response.status === 404) {
        throw new Error("Order not found. Please check the order ID.");
      } else {
        throw new Error(`Failed to cancel order: ${response.statusText}`);
      }
    }
  }

  // Format pizza information for display
  formatPizzaList(pizzas: Pizza[]): string {
    return (
      "Available Pizzas:\n" +
      pizzas
        .map((pizza) => {
          const toppings = pizza.toppings.map((t) => t.name).join(", ");
          return `- ${pizza.name} ($${pizza.price.toFixed(2)}): ${
            pizza.description
          }\n  Toppings: ${toppings}`;
        })
        .join("\n\n")
    );
  }

  // Format pizza details for display
  formatPizzaDetails(pizza: Pizza): string {
    const toppings = pizza.toppings.map((t) => t.name).join(", ");
    return `Pizza: ${pizza.name}\nPrice: $${pizza.price.toFixed(
      2
    )}\nDescription: ${pizza.description}\nToppings: ${toppings}`;
  }

  // Format toppings for display
  formatToppingList(toppings: Topping[]): string {
    // Group toppings by category
    const categories: Record<string, Topping[]> = {};

    toppings.forEach((topping) => {
      const category = topping.category || "Other";
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(topping);
    });

    let result = "Available Toppings:\n";

    for (const [category, categoryToppings] of Object.entries(categories)) {
      result += `\n${category}:\n`;
      categoryToppings.forEach((topping) => {
        result += `- ${topping.name} ($${topping.price.toFixed(2)})\n`;
      });
    }

    return result;
  }

  // Format order details for display
  formatOrderDetails(order: OrderResponse): string {
    const items = order.items.map((item) => {
      let itemStr = `${item.quantity}x ${item.pizza.name}`;
      if (item.extraToppings && item.extraToppings.length > 0) {
        const extraToppings = item.extraToppings.map((t) => t.name).join(", ");
        itemStr += ` with extra ${extraToppings}`;
      }
      return itemStr;
    });

    return `Order ID: ${order.id}
Status: ${order.status}
Items: ${items.join(", ")}
Total: $${order.total.toFixed(2)}
Created At: ${order.createdAt || "N/A"}
Estimated Completion: ${order.estimatedCompletionTime || "N/A"}`;
  }

  // Format multiple orders for display
  formatOrderList(orders: OrderResponse[]): string {
    if (orders.length === 0) {
      return "No orders found matching the criteria.";
    }

    return (
      "Your Orders:\n\n" +
      orders.map((order) => this.formatOrderDetails(order)).join("\n\n")
    );
  }
}
