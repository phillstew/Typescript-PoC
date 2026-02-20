import { RayfinFunctionSchema } from "../rayfin/functions";

// Client interface for individual function clients
export interface RayfinClient<T extends RayfinFunctionSchema<any, any>> {
    readonly name: string;
    call(input: T['input']): Promise<T['output']>;
    callWithOptions(input: T['input'], options: RequestInit): Promise<T['output']>;
}

// Proxy client type that maps function names to their clients
export type RayfinProxyClient<T extends Record<string, RayfinFunctionSchema<any, any>>> = {
    [K in keyof T]: RayfinClient<T[K]>
};

// Configuration for client generation
export interface ClientConfig {
    baseUrl?: string;
    defaultHeaders?: Record<string, string>;
    timeout?: number;
}

// Client generator class
export class RayfinClientGenerator {
    private config: ClientConfig;

    constructor(config: ClientConfig = {}) {
        this.config = {
            baseUrl: config.baseUrl || 'http://localhost:7071/api',
            defaultHeaders: config.defaultHeaders || { 'Content-Type': 'application/json' },
            timeout: config.timeout || 30000
        };
    }

    // Generate a typed client for a RayfinFunction
    generateClientByName<T extends RayfinFunctionSchema<any, any>>(functionName: string
    ): RayfinClient<T> {
        const baseUrl = this.config.baseUrl;
        const defaultHeaders = this.config.defaultHeaders;
        const timeout = this.config.timeout;

        return {
            name: functionName,
            
            async call(input: T['input']): Promise<T['output']> {
                const response = await fetch(`${baseUrl}/${functionName}`, {
                    method: 'POST',
                    headers: defaultHeaders,
                    body: JSON.stringify(input),
                    signal: AbortSignal.timeout(timeout!)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                return result as T['output'];
            },

            async callWithOptions(input: T['input'], options: RequestInit): Promise<T['output']> {
                const mergedOptions: RequestInit = {
                    method: 'POST',
                    headers: { ...defaultHeaders, ...options.headers },
                    body: JSON.stringify(input),
                    signal: options.signal || AbortSignal.timeout(timeout!),
                    ...options
                };

                const response = await fetch(`${baseUrl}/${functionName}`, mergedOptions);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                return result as T['output'];
            }
        };
    }

    // Generate a proxy client that creates clients dynamically
    generateClient<T extends Record<string, RayfinFunctionSchema<any, any>>>(): RayfinProxyClient<T> {
        
        // Create a proxy that dynamically generates clients for any property access
        return new Proxy({} as RayfinProxyClient<T>, {
            get: (target, prop: string | symbol) => {
                if (typeof prop === 'string') {
                    // Generate client on-demand for the requested function name
                    return this.generateClientByName<T[keyof T]>(prop);
                }
                return undefined;
            }
        });
    }

    // Update configuration
    updateConfig(newConfig: Partial<ClientConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
}

// Factory function for creating proxy clients
export function createRayfinProxyClient<T extends Record<string, RayfinFunctionSchema<any, any>>>(
    config?: ClientConfig
): RayfinProxyClient<T> {
    const generator = new RayfinClientGenerator(config);
    
    // Create a proxy that dynamically generates clients for any property access
    return new Proxy({} as RayfinProxyClient<T>, {
        get(target, prop: string | symbol) {
            if (typeof prop === 'string') {
                // Generate client on-demand for the requested function name
                return generator.generateClientByName<T[keyof T]>(prop);
            }
            return undefined;
        }
    });
}

// Factory function for individual clients (backward compatibility)
export function createRayfinClient<T extends RayfinFunctionSchema<any, any>>(
    functionName: string,
    config?: ClientConfig
): RayfinClient<T> {
    const generator = new RayfinClientGenerator(config);
    return generator.generateClientByName<T>(functionName);
}

// Usage Examples:

/*
// 1. Define and export your function schema type (like you have)
export type MyFunctionSchema = {
    helloRayfinFunc: HelloRayfinTypes;
    getUserProfile: RayfinFunctionSchema<{userId: number}, {name: string, email: string}>;
    createUser: RayfinFunctionSchema<{name: string, email: string}, {id: number, success: boolean}>;
};

// 2. Create proxy client using your exported type - no runtime object needed!
const client = createRayfinProxyClient<MyFunctionSchema>({
    baseUrl: 'https://my-api.azurewebsites.net/api'
});

// 3. Use the proxy client with full type safety
const profile = await client.getUserProfile.call({ userId: 123 });
const hello = await client.helloRayfinFunc.call({ name: "John", age: 30 });
const newUser = await client.createUser.call({ 
    name: "Jane Doe", 
    email: "jane@example.com" 
});

// 4. TypeScript will enforce correct input/output types based on your MyFunctionSchema!
// client.helloRayfinFunc.call({ wrongProp: "test" }); // ❌ TypeScript error
// client.helloRayfinFunc.call({ name: "John", age: 30 }); // ✅ Correct

// 5. Without any configuration
const simpleClient = createRayfinProxyClient<MyFunctionSchema>();
const result = await simpleClient.helloRayfinFunc.call({ name: "Alice", age: 25 });
*/