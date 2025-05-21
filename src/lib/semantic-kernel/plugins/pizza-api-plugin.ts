import { BasePlugin } from "../plugins";
import { NativeFunction, FunctionParameter, KernelContext } from "../functions";
import { PizzaApiService } from "../../pizza-api-service";

/**
 * A plugin for the Pizza API service for Semantic Kernel
 */
export class PizzaApiPlugin extends BasePlugin {
  private pizzaApiService: PizzaApiService;

  constructor() {
    super("PizzaAPI", "Plugin for interacting with the Pizza API");
    this.pizzaApiService = new PizzaApiService();
    this.registerFunctions();
  }

  /**
   * Register all the pizza API functions
   */
  private registerFunctions(): void {
    // GetPizzas function
    this.addFunction(
      new NativeFunction(
        "get_pizzas",
        "Get a list of available pizzas",
        async (context: KernelContext) => {
          try {
            const pizzas = await this.pizzaApiService.getPizzas();
            const result = this.pizzaApiService.formatPizzaList(pizzas);
            context.results.push(result);
            return context;
          } catch (error) {
            console.error("Error in get_pizzas function:", error);
            context.results.push("Error retrieving pizzas.");
            return context;
          }
        }
      )
    );

    // GetPizzaById function
    this.addFunction(
      new NativeFunction(
        "get_pizza_by_id",
        "Get a specific pizza by ID",
        async (context: KernelContext) => {
          const pizzaId = context.variables["pizzaId"] || "";

          if (!pizzaId) {
            context.results.push("Error: Pizza ID is required.");
            return context;
          }

          try {
            const pizza = await this.pizzaApiService.getPizzaById(pizzaId);
            const result = this.pizzaApiService.formatPizzaDetails(pizza);
            context.results.push(result);
            return context;
          } catch (error) {
            console.error(
              `Error in get_pizza_by_id function for ID ${pizzaId}:`,
              error
            );
            context.results.push(`Error retrieving pizza with ID ${pizzaId}.`);
            return context;
          }
        },
        [
          {
            name: "pizzaId",
            description: "The ID of the pizza to retrieve",
            isRequired: true,
          },
        ]
      )
    );

    // GetToppings function
    this.addFunction(
      new NativeFunction(
        "get_toppings",
        "Get a list of available toppings",
        async (context: KernelContext) => {
          const category = context.variables["category"] || undefined;

          try {
            const toppings = await this.pizzaApiService.getToppings(category);
            const result = this.pizzaApiService.formatToppingList(toppings);
            context.results.push(result);
            return context;
          } catch (error) {
            console.error("Error in get_toppings function:", error);
            context.results.push("Error retrieving toppings.");
            return context;
          }
        },
        [
          {
            name: "category",
            description: "The category of toppings to retrieve",
            isRequired: false,
          },
        ]
      )
    );

    // GetToppingCategories function
    this.addFunction(
      new NativeFunction(
        "get_topping_categories",
        "Get a list of available topping categories",
        async (context: KernelContext) => {
          try {
            const categories =
              await this.pizzaApiService.getToppingCategories();
            context.results.push(
              `Topping Categories:\n- ${categories.join("\n- ")}`
            );
            return context;
          } catch (error) {
            console.error("Error in get_topping_categories function:", error);
            context.results.push("Error retrieving topping categories.");
            return context;
          }
        }
      )
    );

    // PlaceOrder function
    this.addFunction(
      new NativeFunction(
        "place_order",
        "Place a new pizza order",
        async (context: KernelContext) => {
          const itemsJson = context.variables["items"] || "";

          if (!itemsJson) {
            context.results.push("Error: Order items are required.");
            return context;
          }

          try {
            const items = JSON.parse(itemsJson);
            const order = await this.pizzaApiService.placeOrder(items);
            const result = this.pizzaApiService.formatOrderDetails(order);
            context.results.push(result);
            return context;
          } catch (error) {
            console.error("Error in place_order function:", error);
            context.results.push("Error placing order.");
            return context;
          }
        },
        [
          {
            name: "items",
            description: "JSON string containing the order items",
            isRequired: true,
          },
        ]
      )
    );

    // GetOrders function
    this.addFunction(
      new NativeFunction(
        "get_orders",
        "Get a list of orders",
        async (context: KernelContext) => {
          const status = context.variables["status"] || undefined;
          const last = context.variables["last"] || undefined;

          try {
            const orders = await this.pizzaApiService.getOrders(status, last);
            const result = this.pizzaApiService.formatOrderList(orders);
            context.results.push(result);
            return context;
          } catch (error) {
            console.error("Error in get_orders function:", error);
            context.results.push("Error retrieving orders.");
            return context;
          }
        },
        [
          {
            name: "status",
            description: "Filter orders by status",
            isRequired: false,
          },
          {
            name: "last",
            description: "Get only the last N orders",
            isRequired: false,
          },
        ]
      )
    );

    // GetOrderById function
    this.addFunction(
      new NativeFunction(
        "get_order_by_id",
        "Get a specific order by ID",
        async (context: KernelContext) => {
          const orderId = context.variables["orderId"] || "";

          if (!orderId) {
            context.results.push("Error: Order ID is required.");
            return context;
          }

          try {
            const order = await this.pizzaApiService.getOrderById(orderId);
            const result = this.pizzaApiService.formatOrderDetails(order);
            context.results.push(result);
            return context;
          } catch (error) {
            console.error(
              `Error in get_order_by_id function for ID ${orderId}:`,
              error
            );
            context.results.push(`Error retrieving order with ID ${orderId}.`);
            return context;
          }
        },
        [
          {
            name: "orderId",
            description: "The ID of the order to retrieve",
            isRequired: true,
          },
        ]
      )
    );

    // CancelOrder function
    this.addFunction(
      new NativeFunction(
        "cancel_order",
        "Cancel an existing order",
        async (context: KernelContext) => {
          const orderId = context.variables["orderId"] || "";

          if (!orderId) {
            context.results.push("Error: Order ID is required.");
            return context;
          }

          try {
            await this.pizzaApiService.cancelOrder(orderId);
            context.results.push(
              `Order ${orderId} has been successfully canceled.`
            );
            return context;
          } catch (error) {
            console.error(
              `Error in cancel_order function for ID ${orderId}:`,
              error
            );
            context.results.push(
              `Error canceling order ${orderId}: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
            return context;
          }
        },
        [
          {
            name: "orderId",
            description: "The ID of the order to cancel",
            isRequired: true,
          },
        ]
      )
    );
  }
}
