/**
 * Options for AI service requests
 */
export interface AIRequestOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stopSequences?: string[];
}

/**
 * Base interface for AI services
 */
export interface AIService {
  /**
   * Complete a given prompt
   */
  completePrompt(prompt: string, options?: AIRequestOptions): Promise<string>;

  /**
   * Generate embeddings for a text
   */
  generateEmbeddings?(text: string): Promise<number[]>;
}

/**
 * Response from OpenAI API
 */
interface OpenAIResponse {
  choices: {
    text?: string;
    message?: {
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    total_tokens: number;
  };
}

/**
 * OpenAI service connector
 */
export class OpenAIService implements AIService {
  private apiKey: string;
  private model: string;
  private endpoint: string;

  constructor(apiKey: string, model: string = "gpt-3.5-turbo") {
    this.apiKey = apiKey;
    this.model = model;
    this.endpoint = "https://api.openai.com/v1";
  }

  async completePrompt(
    prompt: string,
    options: AIRequestOptions = {}
  ): Promise<string> {
    const isChatModel = this.model.startsWith("gpt");

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    let requestBody: any;
    let endpoint: string;

    if (isChatModel) {
      // Chat completion
      endpoint = `${this.endpoint}/chat/completions`;
      requestBody = {
        model: this.model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        presence_penalty: options.presencePenalty || 0,
        frequency_penalty: options.frequencyPenalty || 0,
        stop: options.stopSequences,
      };
    } else {
      // Text completion
      endpoint = `${this.endpoint}/completions`;
      requestBody = {
        model: this.model,
        prompt,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 1,
        presence_penalty: options.presencePenalty || 0,
        frequency_penalty: options.frequencyPenalty || 0,
        stop: options.stopSequences,
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = (await response.json()) as OpenAIResponse;

      if (isChatModel) {
        return data.choices[0]?.message?.content || "";
      } else {
        return data.choices[0]?.text || "";
      }
    } catch (error) {
      console.error("Error in OpenAI API call:", error);
      throw error;
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    const endpoint = `${this.endpoint}/embeddings`;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    const requestBody = {
      model: "text-embedding-ada-002",
      input: text,
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error("Error generating embeddings:", error);
      throw error;
    }
  }
}

/**
 * Azure OpenAI service connector
 */
export class AzureOpenAIService implements AIService {
  private apiKey: string;
  private endpoint: string;
  private deploymentName: string;
  private apiVersion: string;

  constructor(
    apiKey: string,
    endpoint: string,
    deploymentName: string,
    apiVersion: string = "2023-05-15"
  ) {
    this.apiKey = apiKey;
    this.endpoint = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
    this.deploymentName = deploymentName;
    this.apiVersion = apiVersion;
  }

  async completePrompt(
    prompt: string,
    options: AIRequestOptions = {}
  ): Promise<string> {
    const endpoint = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;

    const headers = {
      "Content-Type": "application/json",
      "api-key": this.apiKey,
    };

    const requestBody = {
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 1,
      presence_penalty: options.presencePenalty || 0,
      frequency_penalty: options.frequencyPenalty || 0,
      stop: options.stopSequences,
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Azure OpenAI API error: ${error}`);
      }

      const data = (await response.json()) as OpenAIResponse;
      return data.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Error in Azure OpenAI API call:", error);
      throw error;
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    const endpoint = `${this.endpoint}/openai/deployments/${this.deploymentName}/embeddings?api-version=${this.apiVersion}`;

    const headers = {
      "Content-Type": "application/json",
      "api-key": this.apiKey,
    };

    const requestBody = {
      input: text,
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Azure OpenAI API error: ${error}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error("Error generating embeddings:", error);
      throw error;
    }
  }
}
