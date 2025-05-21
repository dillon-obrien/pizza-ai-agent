import { PluginCollection } from "./plugins";
import { Memory } from "./memory";
import { AIService } from "./connectors";

/**
 * The Kernel is the central orchestrator for Semantic Kernel.
 * It manages plugins, functions, and memory.
 */
export class Kernel {
  private readonly plugins: PluginCollection;
  private memory?: Memory;
  private aiService?: AIService;

  constructor() {
    this.plugins = new PluginCollection();
  }

  /**
   * Get the plugin collection
   */
  public getPlugins(): PluginCollection {
    return this.plugins;
  }

  /**
   * Set the memory service
   */
  public withMemory(memory: Memory): Kernel {
    this.memory = memory;
    return this;
  }

  /**
   * Get the memory service
   */
  public getMemory(): Memory | undefined {
    return this.memory;
  }

  /**
   * Set the AI service
   */
  public withAIService(service: AIService): Kernel {
    this.aiService = service;
    return this;
  }

  /**
   * Get the AI service
   */
  public getAIService(): AIService | undefined {
    return this.aiService;
  }

  /**
   * Create a new kernel builder
   */
  public static builder(): KernelBuilder {
    return new KernelBuilder();
  }
}

/**
 * Builder for Kernel
 */
export class KernelBuilder {
  private kernel: Kernel;

  constructor() {
    this.kernel = new Kernel();
  }

  /**
   * Add a memory service to the kernel
   */
  public withMemory(memory: Memory): KernelBuilder {
    this.kernel.withMemory(memory);
    return this;
  }

  /**
   * Add an AI service to the kernel
   */
  public withAIService(service: AIService): KernelBuilder {
    this.kernel.withAIService(service);
    return this;
  }

  /**
   * Build the kernel
   */
  public build(): Kernel {
    return this.kernel;
  }
}
