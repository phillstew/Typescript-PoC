
import { FabricFunctionSchema } from "../functions/fabric";
import { RayfinClientGenerator } from "../rayfin/clientGenerator";


// Example of generating a client and calling a Rayfin function using the Type and Function Reference

let generator = new RayfinClientGenerator();

let client = generator.generateClient<FabricFunctionSchema>();

client.addTodo.call({ title: "Sample Todo", completed: false, id: 1 }).then(async response => {
    console.log(response.message);
});

