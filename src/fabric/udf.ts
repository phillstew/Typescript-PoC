import { app, HttpRequest, HttpResponseInit, InvocationContext, input, FunctionInput } from "@azure/functions";
import { TypeScriptProjectParser } from "../func-parser/parser";


export class DataConnection {
    constructor(public alias: string, public argName: string) {}
}

export type FabricConnection = {
    endpoint: string;
    accessKey: string;
}

export type FabricSqlConnection = FabricConnection & {
    database: string;
}

type FabricConnections = {
    [key: string]: FabricConnection;
}

export class FabricContext {

    public constructor(inputs: FabricConnections){
        this.fabricConnections = inputs;
    }

    requestId: string;
    getConnection<T extends FabricConnection>(alias: string): T {
        return this.fabricConnections[alias] as T;
    }

    getConnectionFromData<T extends FabricConnection>(conn: DataConnection): T {
        return this.getConnection<T>(conn.alias);
    }

    fabricConnections: FabricConnections;
}


export abstract class Udf {

    abstract prepareParameters<T extends {}>(request: HttpRequest, context: InvocationContext): Promise<any[]>;

    abstract prepareResponse(request: HttpRequest, context: InvocationContext, result: any): Promise<HttpResponseInit>;

    abstract prepareContext(request: HttpRequest, context: InvocationContext): Promise<FabricContext>;

    // Store input bindings for connections per function
    inputBindings: { [key: string]: FunctionInput[] } = {};

    customFabricTypes = []; // Example custom types
    parser : TypeScriptProjectParser;

    constructor() {
        this.parser = new TypeScriptProjectParser("./dist/src/functions", this.customFabricTypes);
    }

    func<T extends {}>(name: string, fn: (...args: any[]) => any, connections?: DataConnection[]) {
    
        let extraInputs = [];
        if (connections) {
            connections.forEach(conn => {
                // For alias'd connections
                let newInput = input.generic({
                        type: "FabricItem",
                        alias: conn.alias
                    });
                extraInputs.push(newInput);
            });
            this.inputBindings[name] = extraInputs;
        }
        else {
            this.inputBindings[name] = [];
        }

        app.http(name, {
            methods: ['POST'],
            authLevel: 'anonymous',
            handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
                // Before run
                const args = await this.prepareParameters<T>(request, context);

                const fabricContext: FabricContext = await this.prepareContext(request, context);

                // Run the function
                var resp = await fn(fabricContext, ...args); // This is where you'd extract args from the request and call the function
                
                const response = await this.prepareResponse(request, context, resp);

                // after run
                return response;
            },
            extraInputs: extraInputs
        });
    }

    async start () {
        await this.parser.scanProject();
    }

    logParserSummary() {
        this.parser.generateSummaryReport();
    }
}

export class FabricUdf extends Udf {

    data: {};

    async prepareContext(request: HttpRequest, context: InvocationContext): Promise<FabricContext> {
        
        let connections: FabricConnections = {};
        this.inputBindings[context.functionName].forEach(binding => {
            let input = context.extraInputs.get(binding) as FabricConnection;
            connections[binding.alias as string] = input;
        });
        
        return new FabricContext(connections);
    }

    async prepareParameters<T extends {}>(request: HttpRequest, context: InvocationContext) {
        // Implement any common logic you want to run before every function here
        let paramHeader = request.headers.get("fabric-params");
        var params = paramHeader ? paramHeader.split(",") : [];
  
        // Parse request json body and arrange parameters from headers and body as needed. For now, just return the body as the only parameter
        const requestBody = await request.json();

        if(params.length === 0){
             return [requestBody as T]
        }
        
        var paramInput = [];
        params.forEach(element => {
            requestBody[element] ? paramInput.push(requestBody[element]) : paramInput.push(undefined);
        });

        return paramInput;
    }

    async prepareResponse(request: HttpRequest, context: InvocationContext, result: any) {
        // Implement any common logic you want to run after every function here

        return {
            body: typeof result === 'string' ? result : JSON.stringify(result),
            headers: { 'Content-Type': 'application/json' }
        };
    }
}
