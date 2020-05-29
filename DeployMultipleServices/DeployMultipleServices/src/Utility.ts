import path = require("path");
import tl = require("azure-pipelines-task-lib/task");
import { IExecSyncResult } from 'azure-pipelines-task-lib/toolrunner';

export class Utility {

	public static async deployWebApp(resourceGroup: string, appName: string, appSource: string) {
		Utility.throwIfError(tl.execSync("az", `webapp deployment source config-zip --resource-group ${resourceGroup} --name ${appName} --src ${appSource}`));
	}

	public static async deployWebApps(
		services: string[],
		resourceGroup: string,
		artifactsPath: string,
		appNameFormat: string,
		appPathFormat: string,
		debug: Boolean) {

		for (let service of services) {
			service = service?.trim();
			if (Utility.isNullOrWhitespace(service)) {
				return;
			}

			console.log(`Started deploying service "${service}".`)
			let formatted: string = "";
			let appName: string = service;

			if (!Utility.isNullOrWhitespace(appNameFormat)) {
				appName = Utility.formatString(appNameFormat, service);
				formatted = " (formatted)"
			}
			console.log(`  Application name${formatted}: ${appName}`)

			formatted = "";
			let appSource = path.join(artifactsPath, `${service}.zip`);
			if (!Utility.isNullOrWhitespace(appPathFormat)) {
				appSource = Utility.formatString(appPathFormat, artifactsPath, service);
				formatted = " (formatted)";
			}
			console.log(`  Application source${formatted}: ${appSource}`);

			// Utility.deployWebApp(resourceGroup, appName, appSource);
			await tl.exec("az", `webapp deployment source config-zip --resource-group ${resourceGroup} --name ${appName} --src ${appSource}`);
		}
	}

	public static formatString(format: string, ...args: any[]) {
		return format.replace(/{(\d+)}/g, function (match, number) {
			return typeof args[number] != 'undefined'
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
