"use client";

import { useAgentChat } from "@/hooks/use-agent-chat";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Code } from "@/components/ui/code";

export function AgentChatInterface() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    isStreaming,
    stopStreaming,
    error,
    threadId,
  } = useAgentChat();

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Pizza Ordering System</CardTitle>
            <CardDescription>
              Ask about pizzas, toppings, and place orders
            </CardDescription>
          </div>
          {threadId && (
            <Badge variant="outline" className="px-2 py-1">
              Thread: {threadId.slice(0, 8)}...
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Start a conversation with the pizza assistant
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {/* Function calls display */}
                    {message.functionCalls &&
                      message.functionCalls.length > 0 && (
                        <div className="mb-2 p-2 bg-background/50 rounded text-xs">
                          <p className="text-muted-foreground mb-1">
                            Function calls:
                          </p>
                          {message.functionCalls.map((call, index) => (
                            <details key={index} className="mb-1">
                              <summary className="cursor-pointer text-primary">
                                {call.name}
                              </summary>
                              <Code className="mt-1 text-xs overflow-auto max-h-20">
                                {JSON.stringify(call.arguments, null, 2)}
                              </Code>
                            </details>
                          ))}
                        </div>
                      )}

                    {/* Function results display */}
                    {message.functionResults &&
                      message.functionResults.length > 0 && (
                        <div className="mb-2 p-2 bg-background/50 rounded text-xs">
                          <p className="text-muted-foreground mb-1">
                            Function results:
                          </p>
                          {message.functionResults.map((result, index) => (
                            <details key={index} className="mb-1">
                              <summary className="cursor-pointer text-primary">
                                {result.name}
                              </summary>
                              <div className="mt-1 text-xs overflow-auto max-h-20">
                                {result.result &&
                                result.result.startsWith("{") ? (
                                  <Code>
                                    {JSON.stringify(
                                      JSON.parse(result.result),
                                      null,
                                      2
                                    )}
                                  </Code>
                                ) : (
                                  <p className="whitespace-pre-wrap">
                                    {result.result}
                                  </p>
                                )}
                              </div>
                            </details>
                          ))}
                        </div>
                      )}

                    {/* Message content */}
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                    <div className="flex space-x-2">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce delay-75" />
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce delay-150" />
                    </div>
                  </div>
                </div>
              )}
              {error && (
                <div className="text-destructive text-sm p-2 bg-destructive/10 rounded">
                  {error}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSubmit} className="flex w-full space-x-2">
          <Input
            type="text"
            placeholder="Type a message about pizza..."
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
            className="flex-1"
          />
          {isStreaming ? (
            <Button type="button" variant="destructive" onClick={stopStreaming}>
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? "Sending..." : "Send"}
            </Button>
          )}
        </form>
      </CardFooter>
    </Card>
  );
}
