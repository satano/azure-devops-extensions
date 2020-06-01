import tl = require("azure-pipelines-task-lib/task");
import { IExecSyncResult } from 'azure-pipelines-task-lib/toolrunner';
import { ServiceInfo } from './ServiceInfo'

export class Utility {

	public static parseServices(source: string): ServiceInfo[] {
		var parsed: any[] = JSON.parse(source);

		var services: ServiceInfo[] = parsed.map((item: any, index: number, array: object[]) => {
			var serviceInfo: ServiceInfo = null;
			if (typeof item == "string") {
				var name = (item as string).trim();
				if (name == "") {
					throw new Error(this.getServicesInputErrorMsg(item));
				}
				serviceInfo = { name: item, targetService: "", sourcePath: "" };
			} else if ((typeof item == "object") && (!Array.isArray(item))) {
				var name: string = ("name" in item) ? (item.name as string).trim() : "";
				var targetService: string = ("targetService" in item) ? (item.targetService as string).trim() : "";
				var sourcePath: string = ("sourcePath" in item) ? (item.sourcePath as string).trim() : "";
				if (name == "") {
					name = targetService;
				}
				if (name == "") {
					throw new Error(this.getServicesInputErrorMsg(item));
				}
				serviceInfo = { name: name, targetService: targetService, sourcePath: sourcePath };
			}
			if (serviceInfo == null) {
				throw new Error(this.getServicesInputErrorMsg(item));
			}
			return serviceInfo;
		});

		return services;
	}

	private static getServicesInputErrorMsg(item: any): string {
		const msg = "Invalid input JSON for services. JSON must be an array, " +
			"containing only strings or objects (no nested arrays).\n" +
			"If object is used, it must have at least one of \'name\' or \'targetService\' keys defined.\n" +
			"Invalid element: \n\n";

		return msg + JSON.stringify(item, null, 2);
	}

	public static formatString(format: string, ...args: any[]) {
		return format.replace(/{(\d+)}/g, function (match, number) {
			return typeof args[number] != undefined
				? args[number]
				: match;
		});
	}

	public static isNullOrWhitespace(value: string) {
		if ((value === null) || (value === undefined) || (value === "")) {
			return true;
		}
		return value.match(/^\s*$/g) !== null;
	}

	public static checkIfAzurePythonSdkIsInstalled() {
		return !!tl.which("az", false);
	}

	public static throwIfError(resultOfToolExecution: IExecSyncResult, errormsg?: string): void {
		if (resultOfToolExecution.stdout != null) {
			console.log(resultOfToolExecution.stdout);
		}
		if (resultOfToolExecution.code != 0) {
			if (errormsg) {
				tl.error("Error: " + errormsg);
			}
			tl.error("Error Code: [" + resultOfToolExecution.code + "]");
			if (resultOfToolExecution.error?.message != null) {
				tl.error(resultOfToolExecution.error.message);
			}
			tl.error(resultOfToolExecution.stderr);
			throw resultOfToolExecution;
		}
	}
}
