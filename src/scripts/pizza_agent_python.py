#!/usr/bin/env python3
import asyncio
import os
from typing import Annotated, List
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from semantic_kernel.agents import ChatCompletionAgent
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion, OpenAIChatCompletion
from semantic_kernel.functions import kernel_function, KernelArguments
from semantic_kernel.prompt_template.input_variable import InputVariable
from semantic_kernel.functions.kernel_function_from_prompt import KernelFunctionFromPrompt
from semantic_kernel import Kernel
from semantic_kernel.agents.chat import AgentGroupChat, DefaultTerminationStrategy
from semantic_kernel.agents.chat.selection_strategies import KernelFunctionSelectionStrategy

# Import our Pizza API plugin
from pizza_api_plugin import PizzaApiPlugin

# Load environment variables from .env file
load_dotenv()

# Setup Azure OpenAI service
def get_chat_service():
    # Try Azure OpenAI first
    azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    azure_api_key = os.getenv("AZURE_OPENAI_API_KEY")
    azure_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
    
    if azure_endpoint and azure_api_key and azure_deployment:
        return AzureChatCompletion(
            deployment_name=azure_deployment,
            endpoint=azure_endpoint,
            api_key=azure_api_key
        )
    
    # Fall back to OpenAI direct
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if openai_api_key:
        return OpenAIChatCompletion(api_key=openai_api_key)
    
    raise ValueError("No valid OpenAI credentials found in environment variables.")

# Create a kernel with the chat service
def create_kernel_with_chat_service():
    chat_service = get_chat_service()
    kernel = Kernel()
    kernel.add_service(chat_service)
    return kernel

class PizzaMenuItem(BaseModel):
    name: str = Field(description="Name of the pizza")
    description: str = Field(description="Description of the pizza")
    price: float = Field(description="Price of the pizza in dollars")


class Order(BaseModel):
    items: List[str] = Field(description="List of items ordered")
    customer_name: str = Field(description="Name of the customer")
    total: float = Field(description="Total cost of the order")


class MenuPlugin:
    @kernel_function(description="Provides the available pizza menu options.")
    def get_menu(self) -> Annotated[str, "Returns the pizza menu with options and prices."]:
        menu = """
        Pizza Menu:
        - Margherita ($10.99): Classic tomato sauce and mozzarella cheese
        - Pepperoni ($12.99): Tomato sauce, mozzarella, and pepperoni
        - Vegetarian ($11.99): Tomato sauce, mozzarella, bell peppers, onions, and mushrooms
        - Hawaiian ($13.99): Tomato sauce, mozzarella, ham, and pineapple
        - Supreme ($14.99): Tomato sauce, mozzarella, pepperoni, sausage, bell peppers, onions, and olives
        
        Sides:
        - Garlic Bread ($4.99)
        - Caesar Salad ($5.99)
        - Chicken Wings ($8.99)
        
        Drinks:
        - Soda ($1.99): Coke, Sprite, Dr. Pepper
        - Bottled Water ($1.49)
        - Craft Beer ($5.99)
        """
        return menu

    @kernel_function(description="Gets information about a specific menu item.")
    def get_item_info(
        self, item_name: Annotated[str, "The name of the menu item to get information about."]
    ) -> Annotated[str, "Returns detailed information about the specified menu item."]:
        menu_items = {
            "margherita": {
                "description": "Classic tomato sauce and mozzarella cheese. A traditional Italian pizza.",
                "price": 10.99,
                "ingredients": "Tomato sauce, mozzarella cheese, fresh basil, olive oil, salt",
                "vegetarian": True,
                "vegan": False,
                "gluten_free_option": True
            },
            "pepperoni": {
                "description": "Tomato sauce, mozzarella, and pepperoni. Our most popular pizza.",
                "price": 12.99,
                "ingredients": "Tomato sauce, mozzarella cheese, pepperoni slices",
                "vegetarian": False,
                "vegan": False,
                "gluten_free_option": True
            },
            "vegetarian": {
                "description": "Tomato sauce, mozzarella, bell peppers, onions, and mushrooms.",
                "price": 11.99,
                "ingredients": "Tomato sauce, mozzarella cheese, bell peppers, red onions, mushrooms, olive oil",
                "vegetarian": True,
                "vegan": False,
                "gluten_free_option": True
            },
            "hawaiian": {
                "description": "Tomato sauce, mozzarella, ham, and pineapple. A sweet and savory combination.",
                "price": 13.99,
                "ingredients": "Tomato sauce, mozzarella cheese, ham, pineapple chunks",
                "vegetarian": False,
                "vegan": False,
                "gluten_free_option": True
            },
            "supreme": {
                "description": "Tomato sauce, mozzarella, pepperoni, sausage, bell peppers, onions, and olives. Loaded with toppings.",
                "price": 14.99,
                "ingredients": "Tomato sauce, mozzarella cheese, pepperoni, Italian sausage, bell peppers, red onions, black olives",
                "vegetarian": False,
                "vegan": False,
                "gluten_free_option": True
            },
            "garlic bread": {
                "description": "Toasted bread with garlic butter and herbs.",
                "price": 4.99,
                "ingredients": "Baguette, garlic butter, Italian herbs, parmesan cheese",
                "vegetarian": True,
                "vegan": False,
                "gluten_free_option": False
            },
            "caesar salad": {
                "description": "Romaine lettuce, croutons, parmesan cheese, and Caesar dressing.",
                "price": 5.99,
                "ingredients": "Romaine lettuce, croutons, parmesan cheese, Caesar dressing",
                "vegetarian": True,
                "vegan": False,
                "gluten_free_option": True
            },
            "chicken wings": {
                "description": "Crispy chicken wings with your choice of Buffalo, BBQ, or Garlic Parmesan sauce.",
                "price": 8.99,
                "ingredients": "Chicken wings, choice of sauce, celery sticks, blue cheese or ranch dressing",
                "vegetarian": False,
                "vegan": False,
                "gluten_free_option": True
            }
        }
        
        # Normalize the item name by converting to lowercase
        item_name_lower = item_name.lower()
        
        if item_name_lower in menu_items:
            item = menu_items[item_name_lower]
            return f"""
            {item_name.title()}:
            Description: {item['description']}
            Price: ${item['price']}
            Ingredients: {item['ingredients']}
            Vegetarian: {'Yes' if item['vegetarian'] else 'No'}
            Vegan: {'Yes' if item['vegan'] else 'No'}
            Gluten-free Option: {'Yes' if item['gluten_free_option'] else 'No'}
            """
        else:
            return f"Sorry, I couldn't find information about '{item_name}'. Please check the menu for available items."


class OrderPlugin:
    def __init__(self):
        self.current_orders = {}
        self.order_counter = 0

    @kernel_function(description="Creates a new pizza order for a customer.")
    def create_order(
        self, customer_name: Annotated[str, "The name of the customer placing the order."]
    ) -> Annotated[str, "Returns a confirmation message with the order ID."]:
        self.order_counter += 1
        order_id = f"ORD-{self.order_counter}"
        
        self.current_orders[order_id] = {
            "customer_name": customer_name,
            "items": [],
            "total": 0.0
        }
        
        return f"Order created for {customer_name} with order ID: {order_id}. You can now add items to this order."

    @kernel_function(description="Adds a menu item to an existing order.")
    def add_item_to_order(
        self,
        order_id: Annotated[str, "The ID of the order to add the item to."],
        item_name: Annotated[str, "The name of the item to add."],
        quantity: Annotated[int, "The quantity of the item to add."] = 1
    ) -> Annotated[str, "Returns a confirmation message about the added item."]:
        # Simple pricing lookup
        price_lookup = {
            "margherita": 10.99,
            "pepperoni": 12.99,
            "vegetarian": 11.99,
            "hawaiian": 13.99,
            "supreme": 14.99,
            "garlic bread": 4.99,
            "caesar salad": 5.99,
            "chicken wings": 8.99,
            "soda": 1.99,
            "water": 1.49,
            "beer": 5.99
        }
        
        if order_id not in self.current_orders:
            return f"Order ID {order_id} not found. Please create an order first."
        
        item_name_lower = item_name.lower()
        if item_name_lower not in price_lookup:
            return f"Item '{item_name}' not found in our menu. Please check the menu for available items."
        
        item_price = price_lookup[item_name_lower]
        total_item_price = item_price * quantity
        
        # Add to order
        for _ in range(quantity):
            self.current_orders[order_id]["items"].append(item_name)
        self.current_orders[order_id]["total"] += total_item_price
        
        return f"Added {quantity}x {item_name} (${item_price} each) to order {order_id}. Current order total: ${self.current_orders[order_id]['total']:.2f}"

    @kernel_function(description="Gets the current status of an order.")
    def get_order_status(
        self, order_id: Annotated[str, "The ID of the order to check."]
    ) -> Annotated[str, "Returns the current status of the specified order."]:
        if order_id not in self.current_orders:
            return f"Order ID {order_id} not found. Please check your order ID."
        
        order = self.current_orders[order_id]
        items_summary = {}
        for item in order["items"]:
            if item in items_summary:
                items_summary[item] += 1
            else:
                items_summary[item] = 1
        
        items_list = [f"{quantity}x {item}" for item, quantity in items_summary.items()]
        
        return f"""
        Order ID: {order_id}
        Customer: {order['customer_name']}
        Items: {', '.join(items_list)}
        Total: ${order['total']:.2f}
        """

    @kernel_function(description="Completes an order and prepares it for delivery.")
    def complete_order(
        self, order_id: Annotated[str, "The ID of the order to complete."]
    ) -> Annotated[str, "Returns a confirmation message for the completed order."]:
        if order_id not in self.current_orders:
            return f"Order ID {order_id} not found. Please check your order ID."
        
        order = self.current_orders[order_id]
        
        # In a real system, this would trigger payment processing, kitchen notifications, etc.
        completion_message = f"""
        Thank you, {order['customer_name']}!
        
        Your order (ID: {order_id}) has been confirmed and is being prepared.
        Total: ${order['total']:.2f}
        
        Your delicious pizza will be ready in approximately 25-30 minutes.
        """
        
        # For demonstration purposes, we'll keep the order in memory
        # In a real system, we would move it to a 'completed_orders' database
        
        return completion_message


async def setup_multi_agent_system():
    # Get the appropriate chat service based on available credentials
    chat_service = get_chat_service()
    kernel = create_kernel_with_chat_service()
    
    # Initialize the Pizza API plugin
    pizza_api_plugin = PizzaApiPlugin()
    
    # Create menu specialist agent
    menu_agent = ChatCompletionAgent(
        service=chat_service,
        name="MenuAgent",
        instructions="""You are a specialist in pizza restaurant menus. 
        Your role is to help customers understand the menu options, ingredients, and pricing.
        Use the Pizza API to get accurate and up-to-date information about available pizzas and toppings.
        Be informative, friendly, and helpful when discussing menu items.""",
        plugins=[pizza_api_plugin]
    )
    
    # Create order specialist agent
    order_agent = ChatCompletionAgent(
        service=chat_service,
        name="OrderAgent",
        instructions="""You are a specialist in handling pizza restaurant orders.
        Your role is to help customers create and manage their orders using the Pizza API.
        You can help customers place new orders, check order status, and cancel orders if needed.
        
        When a customer wants to place an order:
        1. First get the list of available pizzas using the Pizza API
        2. Help them select pizzas and quantities
        3. Place the order using the place_order function
        4. Provide order confirmation details
        
        Be efficient, accurate, and friendly when processing orders.""",
        plugins=[pizza_api_plugin]
    )
    
    # Define selection function for agent selection
    selection_function = KernelFunctionFromPrompt(
        function_name="agent_selection",
        prompt="""
        Determine which agent should handle this user request.
        State ONLY the name of the agent to take the next turn.
        
        Choose only from these agents:
        - MenuAgent: For questions about menu items, ingredients, prices, getting pizza information, browsing the menu, 
                    asking about available pizzas, or any general menu information.
        - OrderAgent: For creating orders, placing orders, adding items to orders, checking order status, 
                     canceling orders, or any order management task.
        
        User request: {{$user_message}}
        
        Reply with just the name of the agent (MenuAgent or OrderAgent).
        """,
    )
    
    # Create selection strategy
    selection_strategy = KernelFunctionSelectionStrategy(
        function=selection_function,
        kernel=kernel,
        result_parser=lambda result: str(result.value) if result.value is not None else "MenuAgent",
        user_message_variable_name="user_message"
    )
    
    # Create agent group chat
    agent_chat = AgentGroupChat(
        agents=[menu_agent, order_agent],
        selection_strategy=selection_strategy,
        termination_strategy=DefaultTerminationStrategy(maximum_iterations=1)  # Single response per user input
    )
    
    return agent_chat


async def chat_with_pizza_agent():
    print("Setting up pizza ordering system with multi-agent architecture...")
    try:
        agent_chat = await setup_multi_agent_system()
        
        print("\nWelcome to the Pizza Ordering System!")
        print("You can ask about our menu, place orders, or get information about specific dishes.")
        print("Type 'exit' to quit the conversation.")
        
        while True:
            user_input = input("\nYou: ")
            
            if user_input.lower() == "exit":
                print("\nThank you for using our Pizza Ordering System. Goodbye!")
                break
            
            # Add the user message to the chat
            await agent_chat.add_chat_message(message=user_input)
            
            # Invoke the group chat and get responses
            async for response in agent_chat.invoke():
                print(f"\nAgent ({response.author_name}): {response.content}")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        print("\nPlease make sure you have set the correct environment variables.")
        print("Required: Either OPENAI_API_KEY or (AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT_NAME)")


if __name__ == "__main__":
    asyncio.run(chat_with_pizza_agent()) 