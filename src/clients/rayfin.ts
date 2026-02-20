
import { MyFunctionSchema } from "../functions/rayfin";
import { RayfinClientGenerator } from "../rayfin/clientGenerator";


// Example of generating a client and calling a Rayfin function using the Type and Function Reference

let generator = new RayfinClientGenerator();

let client = generator.generateClient<MyFunctionSchema>();

client.helloRayfinFunc.call({ name: "Alice", age: 30 }).then(async response => {
    console.log(response.message);
});


