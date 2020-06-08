import tl = require("azure-pipelines-task-lib/task");
import { Utility } from "./src/Utility";

var basePath = "d:\\proj\\github\\satano\\azure-devops-extensions\\_test";
var fileName = "README.md";

var files = tl.findMatch(basePath, "**/" + fileName);

for (const file of files) {
	console.log(file);
}

var s = "";

console.log(`s is "" | s == null: ${s == null}`)
console.log(`s is "" | s == undefined: ${s == undefined}`)
console.log(`s is "" | s == "": ${s == ""}`)

s = undefined
console.log(`s is "undefined" | s == null: ${s == null}`)
console.log(`s is "undefined" | s == undefined: ${s == undefined}`)
console.log(`s is "undefined" | s == "": ${s == ""}`)

s = null
console.log(`s is "null" | s == null: ${s == null}`)
console.log(`s is "null" | s == undefined: ${s == undefined}`)
console.log(`s is "null" | s == "": ${s == ""}`)
