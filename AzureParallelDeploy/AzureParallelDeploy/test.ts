import { ServiceInfo } from "./src/ServiceInfo"
import { Utility } from "./src/Utility";

var services: string = `[
	"api1",
	"api2",
	{
		"name": "api3",
		"targetService": "api3-TARGET",
		"sourcePath": "api3-SOURCE"
	},
	"api4",
	{
		"name": "api5"
	},
	{
		"name": "api6",
		"targetService": "api6-TARGET",
		"sourcePath": "",
		"chujovinu": "lortem"
	},
	"api7",
	{
		"name": "api8",
		"targetService": "",
		"sourcePath": "api8-SOURCE"
	},
	{
		"name": "api9",
		"targetService": "",
		"sourcePath": ""
	},
	{
		"name": "api9",
		"targetService": "",
		"sourcePath": ""
	}
]`;
// var data: ServiceInfo[] = Utility.parseServices(services);

// for (const item  of data) {
// 	console.log(item.targetService);

// }
// console.log(data);

console.log(null == undefined);
console.log(null === undefined);

function test(input: string): string[] {
	return Utility.parseServices(input);
}

console.log(test(null));
console.log("---");
console.log(test(undefined));
console.log("---");
console.log(test("lorem,ipsum,dolor"));
console.log("---");
console.log(test("lorem, \" '  ipsum' \", dolor"));
console.log("---");
console.log(test("lorem;ipsum;dolor"));
console.log("---");
console.log(test("lorem\nipsum\ndolor"));
console.log("---");
console.log(test("lorem\r\nipsum\r\ndolor"));
console.log("---");
