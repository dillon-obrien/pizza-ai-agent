#!/usr/bin/env python3
import os
import requests
from typing import Annotated, List, Dict, Any, Optional
from semantic_kernel.functions import kernel_function

# Pizza API URLs
PIZZA_API_BASE_URL = "https://func-pizza-api-vqqlxwmln5lf4.azurewebsites.net"

class PizzaApiPlugin:
    """Plugin to interact with the Pizza API for menu and order management."""
    
    def __init__(self):
        """Initialize the plugin with the user ID from environment variables."""
        self.user_id = os.getenv("PIZZA_ID")
        if not self.user_id:
            raise ValueError("PIZZA_ID environment variable not set. Please set it to your assigned Pizza user ID.")
    
    @kernel_function(description="Get a list of all available pizzas from the menu.")
    def get_pizzas(self) -> Annotated[str, "Returns a list of all pizzas available on the menu."]:
        """Get list of all pizzas from the Pizza API."""
        try:
            response = requests.get(f"{PIZZA_API_BASE_URL}/api/pizzas")
            response.raise_for_status()
            pizzas = response.json()
            
            # Format the response in a readable format
            pizza_list = []
            for pizza in pizzas:
                toppings = ", ".join([t["name"] for t in pizza.get("toppings", [])])
                pizza_list.append(
                    f"- {pizza['name']} (${pizza['price']:.2f}): {pizza['description']}\n"
                    f"  Toppings: {toppings}"
                )
            
            result = "Available Pizzas:\n" + "\n\n".join(pizza_list)
            return result
        except Exception as e:
            return f"Error retrieving pizzas: {str(e)}"

    @kernel_function(description="Get a specific pizza by its ID.")
    def get_pizza_by_id(
        self, pizza_id: Annotated[str, "The ID of the pizza to retrieve."]
    ) -> Annotated[str, "Returns detailed information about the specified pizza."]:
        """Get details of a specific pizza by ID."""
        try:
            response = requests.get(f"{PIZZA_API_BASE_URL}/api/pizzas/{pizza_id}")
            response.raise_for_status()
            pizza = response.json()
            
            toppings = ", ".join([t["name"] for t in pizza.get("toppings", [])])
            result = (
                f"Pizza: {pizza['name']}\n"
                f"Price: ${pizza['price']:.2f}\n"
                f"Description: {pizza['description']}\n"
                f"Toppings: {toppings}"
            )
            return result
        except Exception as e:
            return f"Error retrieving pizza with ID {pizza_id}: {str(e)}"

    @kernel_function(description="Get a list of all available toppings.")
    def get_toppings(
        self, category: Annotated[str, "Optional category to filter toppings."] = None
    ) -> Annotated[str, "Returns a list of toppings, optionally filtered by category."]:
        """Get list of all toppings, optionally filtered by category."""
        try:
            url = f"{PIZZA_API_BASE_URL}/api/toppings"
            if category:
                url += f"?category={category}"
                
            response = requests.get(url)
            response.raise_for_status()
            toppings = response.json()
            
            # Group toppings by category
            categories = {}
            for topping in toppings:
                cat = topping.get("category", "Other")
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(f"{topping['name']} (${topping['price']:.2f})")
            
            # Format the response
            result = "Available Toppings:\n"
            for cat, items in categories.items():
                result += f"\n{cat}:\n"
                for item in items:
                    result += f"- {item}\n"
            
            return result
        except Exception as e:
            return f"Error retrieving toppings: {str(e)}"

    @kernel_function(description="Get a list of all topping categories.")
    def get_topping_categories(self) -> Annotated[str, "Returns a list of all topping categories."]:
        """Get list of all topping categories."""
        try:
            response = requests.get(f"{PIZZA_API_BASE_URL}/api/toppings/categories")
            response.raise_for_status()
            categories = response.json()
            
            return "Topping Categories:\n- " + "\n- ".join(categories)
        except Exception as e:
            return f"Error retrieving topping categories: {str(e)}"

    @kernel_function(description="Get a list of orders.")
    def get_orders(
        self, 
        status: Annotated[str, "Optional status to filter orders (e.g., 'pending', 'ready', 'completed')."] = None,
        last: Annotated[str, "Optional time constraint (e.g., '60m', '2h')."] = None
    ) -> Annotated[str, "Returns a list of orders, optionally filtered by status and time."]:
        """Get list of orders filtered by the provided parameters."""
        try:
            params = {"userId": self.user_id}
            if status:
                params["status"] = status
            if last:
                params["last"] = last
                
            response = requests.get(f"{PIZZA_API_BASE_URL}/api/orders", params=params)
            response.raise_for_status()
            orders = response.json()
            
            if not orders:
                return "No orders found matching the criteria."
            
            # Format the response
            order_list = []
            for order in orders:
                items = []
                for item in order.get("items", []):
                    pizza_info = f"{item['quantity']}x {item['pizza']['name']}"
                    if item.get("extraToppings"):
                        extra_toppings = ", ".join([t["name"] for t in item["extraToppings"]])
                        pizza_info += f" with extra {extra_toppings}"
                    items.append(pizza_info)
                
                order_list.append(
                    f"Order ID: {order['id']}\n"
                    f"Status: {order['status']}\n"
                    f"Items: {', '.join(items)}\n"
                    f"Total: ${order['total']:.2f}\n"
                    f"Estimated Completion: {order.get('estimatedCompletionTime', 'N/A')}"
                )
            
            return "Your Orders:\n\n" + "\n\n".join(order_list)
        except Exception as e:
            return f"Error retrieving orders: {str(e)}"

    @kernel_function(description="Get a specific order by its ID.")
    def get_order_by_id(
        self, order_id: Annotated[str, "The ID of the order to retrieve."]
    ) -> Annotated[str, "Returns detailed information about the specified order."]:
        """Get details of a specific order by ID."""
        try:
            response = requests.get(f"{PIZZA_API_BASE_URL}/api/orders/{order_id}")
            response.raise_for_status()
            order = response.json()
            
            # Format items
            items = []
            for item in order.get("items", []):
                pizza_info = f"{item['quantity']}x {item['pizza']['name']}"
                if item.get("extraToppings"):
                    extra_toppings = ", ".join([t["name"] for t in item["extraToppings"]])
                    pizza_info += f" with extra {extra_toppings}"
                items.append(pizza_info)
            
            result = (
                f"Order ID: {order['id']}\n"
                f"Status: {order['status']}\n"
                f"Items: {', '.join(items)}\n"
                f"Total: ${order['total']:.2f}\n"
                f"Created At: {order.get('createdAt', 'N/A')}\n"
                f"Estimated Completion: {order.get('estimatedCompletionTime', 'N/A')}"
            )
            return result
        except Exception as e:
            return f"Error retrieving order with ID {order_id}: {str(e)}"

    @kernel_function(description="Place a new pizza order.")
    def place_order(
        self,
        pizza_ids: Annotated[str, "Comma-separated list of pizza IDs to order."],
        quantities: Annotated[str, "Comma-separated list of quantities for each pizza."],
        extra_toppings: Annotated[str, "Optional comma-separated list of extra topping IDs for each pizza."] = None
    ) -> Annotated[str, "Returns a confirmation of the order placement."]:
        """Place a new order with the specified pizzas and optional extra toppings."""
        try:
            # Parse inputs
            pizza_id_list = [id.strip() for id in pizza_ids.split(",")]
            quantity_list = [int(qty.strip()) for qty in quantities.split(",")]
            
            # Make sure we have matching quantities for each pizza
            if len(pizza_id_list) != len(quantity_list):
                return "Error: The number of pizza IDs must match the number of quantities."
            
            # Parse extra toppings if provided
            extra_toppings_list = None
            if extra_toppings:
                extra_toppings_list = []
                for toppings_str in extra_toppings.split(";"):
                    if toppings_str.strip():
                        extra_toppings_list.append([t.strip() for t in toppings_str.split(",")])
                    else:
                        extra_toppings_list.append([])
                
                # Make sure we have matching extra toppings for each pizza
                if len(pizza_id_list) != len(extra_toppings_list):
                    return "Error: The number of extra topping sets must match the number of pizzas."
            
            # Build request data
            items = []
            for i, pizza_id in enumerate(pizza_id_list):
                item = {
                    "pizzaId": pizza_id,
                    "quantity": quantity_list[i]
                }
                
                if extra_toppings_list and i < len(extra_toppings_list) and extra_toppings_list[i]:
                    item["extraToppingIds"] = extra_toppings_list[i]
                
                items.append(item)
            
            data = {
                "userId": self.user_id,
                "items": items
            }
            
            # Send the request
            response = requests.post(f"{PIZZA_API_BASE_URL}/api/orders", json=data)
            response.raise_for_status()
            order = response.json()
            
            # Format response
            items = []
            for item in order.get("items", []):
                pizza_info = f"{item['quantity']}x {item['pizza']['name']}"
                if item.get("extraToppings"):
                    extra_toppings = ", ".join([t["name"] for t in item["extraToppings"]])
                    pizza_info += f" with extra {extra_toppings}"
                items.append(pizza_info)
            
            result = (
                f"Order successfully placed!\n\n"
                f"Order ID: {order['id']}\n"
                f"Status: {order['status']}\n"
                f"Items: {', '.join(items)}\n"
                f"Total: ${order['total']:.2f}\n"
                f"Estimated Completion: {order.get('estimatedCompletionTime', 'N/A')}"
            )
            return result
        except Exception as e:
            return f"Error placing order: {str(e)}"

    @kernel_function(description="Cancel an order by its ID.")
    def cancel_order(
        self, order_id: Annotated[str, "The ID of the order to cancel."]
    ) -> Annotated[str, "Returns a confirmation of the order cancellation."]:
        """Cancel an order if it has not yet been started."""
        try:
            response = requests.delete(
                f"{PIZZA_API_BASE_URL}/api/orders/{order_id}",
                params={"userId": self.user_id}
            )
            response.raise_for_status()
            
            return f"Order {order_id} has been successfully canceled."
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 400:
                return "Error: The order cannot be canceled. It may have already started preparation."
            elif e.response.status_code == 404:
                return "Error: Order not found. Please check the order ID."
            else:
                return f"Error canceling order: {str(e)}"
        except Exception as e:
            return f"Error canceling order: {str(e)}" 