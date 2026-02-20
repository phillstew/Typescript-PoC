import { FabricContext, FabricUdf, DataConnection, FabricSqlConnection } from "../fabric/udf";
import { PersonDto } from "../sharedTypes/person";

// Fabric UDFs

// Fabric UDFs Should be similar to Python UDFs
// Parameters will be noted in the metadata and will need to be passed down to each call due to 
//    how javacript functions work: 
//    func(context, [array of arguments])
//        header: fabric-params: name,age
//        body: { age: 30, name: "Alice", other: "random data" } // Allow for unorganized body since we cannot rely on order


const udf = new FabricUdf();

udf.func("helloWorld", 
    async (context : FabricContext, name: string, age: number) => {
        return `Hello, ${name}! You are ${age} years old.`;
    });
    

udf.func("helloWorldWithConnection", 
    async (context : FabricContext, name: string, age: number) => {
        const sqlConn = context.getConnection<FabricSqlConnection>("mySql");
        
        // Use sqlConn...

        return { message: `Hello, ${name}! You are ${age} years old.` }

    }, [new DataConnection("mySql")]);

    
udf.func<PersonDto>("helloWorldWithDto", async (context: FabricContext, input: PersonDto) => {
    return { message: `Hello, ${input.name}! You are ${input.age} years old.` };
});

// Another option for getting connections.
// More similar to how connection input bindings work in Azure Functions

const mySqlConn = new DataConnection("mySql")

udf.func("helloWorldWithConnectionOptions", 
    async (context : FabricContext, name: string, age: number) => {
        const sqlConn = context.getConnectionFromData<FabricSqlConnection>(mySqlConn);
        
        return { message: `Hello, ${name}! You are ${age} years old.` }

    }, [mySqlConn]);

