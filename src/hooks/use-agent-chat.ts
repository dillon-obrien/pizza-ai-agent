"use client";

import { useState, FormEvent, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface FunctionResult {
  name: string;
  result: string;
}

export interface AgentChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  functionCalls?: FunctionCall[];
  functionResults?: FunctionResult[];
}

export function useAgentChat() {
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);

  // For streaming responses
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track intermediate steps (function calls/results)
  const [intermediateSteps, setIntermediateSteps] = useState<
    (FunctionCall | FunctionResult)[]
  >([]);

  // Clean up the thread when the component unmounts
  useEffect(() => {
    return () => {
      if (threadId) {
        fetch(`/api/agent?threadId=${threadId}`, {
          method: "DELETE",
        }).catch((err) => {
          console.error("Error cleaning up thread:", err);
        });
      }
    };
  }, [threadId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | { target: { value: string } }
  ) => {
    setInput(e.target.value);
  };

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage: AgentChatMessage = {
      id: uuidv4(),
      content: input.trim(),
      role: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);
    setIntermediateSteps([]);

    // Create new temporary message for streaming
    const assistantMessageId = uuidv4();
    const assistantMessage: AgentChatMessage = {
      id: assistantMessageId,
      content: "",
      role: "assistant",
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Initialize a new abort controller for this request
      abortControllerRef.current = new AbortController();
      setIsStreaming(true);

      // Start streaming response
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          threadId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to get response from Azure AI Agent"
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to get stream reader");

      let receivedText = "";
      let receivedThreadId = null;
      let functionCalls: FunctionCall[] = [];
      let functionResults: FunctionResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the received chunk to text
        const chunk = new TextDecoder().decode(value);
        console.log("Received chunk:", chunk);

        // Process each chunk by finding valid JSON objects
        try {
          // More robust approach to handle JSON objects in the stream
          const processedChunk = chunk.trim();

          // Try to parse as a single complete JSON object first
          try {
            const parsed = JSON.parse(processedChunk);

            // Process the parsed object based on its type
            if (
              parsed.type === "metadata" &&
              parsed.threadId &&
              !receivedThreadId
            ) {
              receivedThreadId = parsed.threadId;
              setThreadId(receivedThreadId);
            } else if (parsed.type === "init") {
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: parsed.content || "Thinking..." }
                    : msg
                )
              );
            } else if (parsed.type === "functionCall") {
              const functionCall: FunctionCall = {
                name: parsed.name,
                arguments: parsed.arguments || {},
              };
              functionCalls.push(functionCall);
              setIntermediateSteps((steps) => [...steps, functionCall]);
            } else if (parsed.type === "functionResult") {
              const functionResult: FunctionResult = {
                name: parsed.name,
                result: parsed.result || "",
              };
              functionResults.push(functionResult);
              setIntermediateSteps((steps) => [...steps, functionResult]);
            } else if (parsed.type === "content" && parsed.content) {
              receivedText = parsed.content;
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: receivedText }
                    : msg
                )
              );
            } else if (parsed.type === "done") {
              // We're done processing this stream
            } else if (parsed.content) {
              // Handle unknown message types with content
              receivedText = parsed.content;
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: receivedText }
                    : msg
                )
              );
            }
          } catch (singleJsonError) {
            // If parsing as a single object fails, try to find multiple JSON objects
            let startPos = 0;
            let depth = 0;
            let inString = false;
            let escapeNext = false;

            for (let i = 0; i < processedChunk.length; i++) {
              const char = processedChunk[i];

              if (escapeNext) {
                escapeNext = false;
                continue;
              }

              if (char === "\\" && inString) {
                escapeNext = true;
                continue;
              }

              if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
              }

              if (!inString) {
                if (char === "{") {
                  if (depth === 0) {
                    startPos = i;
                  }
                  depth++;
                } else if (char === "}") {
                  depth--;

                  if (depth === 0) {
                    // We found a complete JSON object
                    const jsonObj = processedChunk.substring(startPos, i + 1);

                    try {
                      const parsed = JSON.parse(jsonObj);

                      // Process the parsed object (same logic as above)
                      if (
                        parsed.type === "metadata" &&
                        parsed.threadId &&
                        !receivedThreadId
                      ) {
                        receivedThreadId = parsed.threadId;
                        setThreadId(receivedThreadId);
                      } else if (parsed.type === "init") {
                        setMessages((prevMessages) =>
                          prevMessages.map((msg) =>
                            msg.id === assistantMessageId
                              ? {
                                  ...msg,
                                  content: parsed.content || "Thinking...",
                                }
                              : msg
                          )
                        );
                      } else if (parsed.type === "functionCall") {
                        const functionCall: FunctionCall = {
                          name: parsed.name,
                          arguments: parsed.arguments || {},
                        };
                        functionCalls.push(functionCall);
                        setIntermediateSteps((steps) => [
                          ...steps,
                          functionCall,
                        ]);
                      } else if (parsed.type === "functionResult") {
                        const functionResult: FunctionResult = {
                          name: parsed.name,
                          result: parsed.result || "",
                        };
                        functionResults.push(functionResult);
                        setIntermediateSteps((steps) => [
                          ...steps,
                          functionResult,
                        ]);
                      } else if (parsed.type === "content" && parsed.content) {
                        receivedText = parsed.content;
                        setMessages((prevMessages) =>
                          prevMessages.map((msg) =>
                            msg.id === assistantMessageId
                              ? { ...msg, content: receivedText }
                              : msg
                          )
                        );
                      } else if (parsed.type === "done") {
                        // We're done processing this stream
                      } else if (parsed.content) {
                        // Handle unknown message types with content
                        receivedText = parsed.content;
                        setMessages((prevMessages) =>
                          prevMessages.map((msg) =>
                            msg.id === assistantMessageId
                              ? { ...msg, content: receivedText }
                              : msg
                          )
                        );
                      }
                    } catch (innerParseError) {
                      console.error(
                        "Error parsing inner JSON object:",
                        innerParseError,
                        jsonObj
                      );
                    }
                  }
                }
              }
            }
          }
        } catch (processingError) {
          console.error("Error processing chunk:", processingError);
        }
      }

      // After streaming is complete, save the thread ID
      if (receivedThreadId) {
        setThreadId(receivedThreadId);
      }

      // Update the final message with intermediate steps
      if (functionCalls.length > 0 || functionResults.length > 0) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  functionCalls,
                  functionResults,
                }
              : msg
          )
        );
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") {
        console.log("Request was cancelled");
      } else {
        console.error("Error calling Azure AI Agent:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to get a response from Azure AI Agent."
        );

        // Update the message with an error
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content:
                    "I'm sorry, I'm having trouble connecting to the server. Please try again later.",
                }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // For regular non-streaming API call
  const handleSubmitNonStreaming = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    // Add user message
    const userMessage: AgentChatMessage = {
      id: uuidv4(),
      content: input.trim(),
      role: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      // Call the API to get a response from Azure AI Agent
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          threadId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to get response from Azure AI Agent"
        );
      }

      const data = await response.json();

      // Set the thread ID for future messages
      setThreadId(data.threadId);

      // Add AI response
      const assistantMessage: AgentChatMessage = {
        id: uuidv4(),
        content: data.response,
        role: "assistant",
        functionCalls: data.functionCalls || [],
        functionResults: data.functionResults || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Error calling Azure AI Agent:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to get a response from Azure AI Agent."
      );

      // Add a fallback message
      const assistantMessage: AgentChatMessage = {
        id: uuidv4(),
        content:
          "I'm sorry, I'm having trouble connecting to the server. Please try again later.",
        role: "assistant",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    handleSubmitNonStreaming,
    isLoading,
    isStreaming,
    stopStreaming,
    error,
    threadId,
    intermediateSteps,
  };
}
