/**
 * Context for function execution
 */
export interface KernelContext {
  variables: Record<string, string>;
  results: string[];
}

/**
 * Base interface for all Semantic Kernel functions
 */
export interface KernelFunction {
  name: string;
  description: string;
  execute(context: KernelContext): Promise<KernelContext>;
}

/**
 * Parameters for a function
 */
export interface FunctionParameter {
  name: string;
  description: string;
  defaultValue?: string;
  isRequired: boolean;
}

/**
 * A basic function that processes input and returns output
 */
export abstract class BaseFunction implements KernelFunction {
  public readonly name: string;
  public readonly description: string;
  public readonly parameters: FunctionParameter[];

  constructor(
    name: string,
    description: string,
    parameters: FunctionParameter[] = []
  ) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
  }

  /**
   * Execute the function with the given context
   */
  abstract execute(context: KernelContext): Promise<KernelContext>;
}

/**
 * A function that uses a native TypeScript function for execution
 */
export class NativeFunction extends BaseFunction {
  private handler: (
    context: KernelContext
  ) => Promise<KernelContext> | KernelContext;

  constructor(
    name: string,
    description: string,
    handler: (context: KernelContext) => Promise<KernelContext> | KernelContext,
    parameters: FunctionParameter[] = []
  ) {
    super(name, description, parameters);
    this.handler = handler;
  }

  async execute(context: KernelContext): Promise<KernelContext> {
    const result = this.handler(context);
    return result instanceof Promise ? await result : result;
  }
}

/**
 * Create a new kernel context
 */
export function createContext(
  variables: Record<string, string> = {}
): KernelContext {
  return {
    variables,
    results: [],
  };
}
