import { RayfinFunctions, RayfinFunctionSchema } from "../rayfin/functions";
import { PersonDto, ResponseDto } from "../sharedTypes/person";
import { FabricContext, DataConnection, FabricSqlConnection } from "../fabric/udf";

// Rayfin version - Define once, use everywhere

// Rayfin functions should always have types declared so we can easily generate a client for it
// Both options we'll need to export the Types for any clients to use
// Currently the Context here is named FabricContext but will more likely be a generic Context object for
//    unique aspects of Fabric or Rayfin

const rayfinFunctions = new RayfinFunctions();

type HelloRayfinTypes = RayfinFunctionSchema<PersonDto, ResponseDto>;

// Hello Rayfin Function - No connections, just input and output

async function helloRayfinFunc(context: FabricContext, input: PersonDto) : Promise<ResponseDto> {
    return { message: `Hello, ${input.name}! You are ${input.age} years old.` };
}

rayfinFunctions.func<HelloRayfinTypes>(helloRayfinFunc);

// Hello Rayfin Function - With connections. Both using the same input type.

var myAlias = new DataConnection("myAlias");

async function helloRayfinFuncWithConnections(context: FabricContext, input: PersonDto) : Promise<ResponseDto> {
    const sqlConn = context.getConnection<FabricSqlConnection>("myAlias");
    
    // sqlConn.RunSql("...")
    
    return { message: `Hello, ${input.name}! You are ${input.age} years old.` };
}

rayfinFunctions.func<HelloRayfinTypes>(helloRayfinFuncWithConnections, [myAlias]);

export type MyFunctionSchema = {
    helloRayfinFunc: HelloRayfinTypes;
    helloRayfinFuncWithConnections: HelloRayfinTypes;
}
