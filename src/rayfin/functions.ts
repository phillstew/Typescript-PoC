import { HttpRequest, InvocationContext, HttpResponseInit } from "@azure/functions";
import { DataConnection, FabricContext, FabricUdf, Udf } from "../fabric/udf";

// Generic type for creating request/response pairs
export type RayfinFunctionSchema<TRequest, TResponse> = {
    input: TRequest;
    output: TResponse;
};

export class RayfinFunctions {

    private udf: FabricUdf;

    constructor() {
        this.udf = new FabricUdf();
    }

    func<T extends RayfinFunctionSchema<any, any>>(fn: (context: FabricContext, input: T['input']) => Promise<T['output']>, connections?: DataConnection[]): void {
        console.log(`Registering function: ${fn.name}`);
        this.udf.prepareParameters = async (request: HttpRequest, context: InvocationContext) => {
            console.log(`Preparing parameters for function: ${fn.name}`);
            const requestBody = await request.json();
            return [requestBody];
        }
        this.udf.func(fn.name, fn, connections);
    }


    funcWithName<T extends RayfinFunctionSchema<any, any>>(name: string, fn: (context: FabricContext, input: T['input']) => Promise<T['output']>, connections?: DataConnection[]): void {
        console.log(`Registering function: ${name}`);
        this.udf.prepareParameters = async (request: HttpRequest, context: InvocationContext) => {
            console.log(`Preparing parameters for function: ${name}`);
            const requestBody = await request.json();
            return [requestBody];
        }

        this.udf.func(name, fn, connections);
    }
}
