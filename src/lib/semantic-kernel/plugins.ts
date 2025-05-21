import { KernelFunction } from "./functions";

/**
 * A plugin is a collection of related functions
 */
export interface Plugin {
  name: string;
  description: string;
  getFunctions(): KernelFunction[];
}

/**
 * Collection of plugins
 */
export class PluginCollection {
  private plugins: Record<string, Plugin>;
  private functions: Record<string, KernelFunction>;

  constructor() {
    this.plugins = {};
    this.functions = {};
  }

  /**
   * Add a plugin to the collection
   */
  addPlugin(plugin: Plugin): void {
    this.plugins[plugin.name] = plugin;

    // Register all functions from the plugin
    for (const func of plugin.getFunctions()) {
      const fullyQualifiedName = `${plugin.name}.${func.name}`;
      this.functions[fullyQualifiedName] = func;
    }
  }

  /**
   * Get a plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins[name];
  }

  /**
   * Get all plugins
   */
  getPlugins(): Plugin[] {
    return Object.values(this.plugins);
  }

  /**
   * Get a function by fully qualified name (plugin.function)
   */
  getFunction(fullyQualifiedName: string): KernelFunction | undefined {
    return this.functions[fullyQualifiedName];
  }

  /**
   * Get all functions
   */
  getFunctions(): KernelFunction[] {
    return Object.values(this.functions);
  }
}

/**
 * Base class for implementing plugins
 */
export abstract class BasePlugin implements Plugin {
  public readonly name: string;
  public readonly description: string;
  protected functions: KernelFunction[];

  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
    this.functions = [];
  }

  /**
   * Add a function to the plugin
   */
  addFunction(func: KernelFunction): void {
    this.functions.push(func);
  }

  /**
   * Get all functions in the plugin
   */
  getFunctions(): KernelFunction[] {
    return [...this.functions];
  }
}
