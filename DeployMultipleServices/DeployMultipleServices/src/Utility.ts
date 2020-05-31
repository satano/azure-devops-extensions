import path = require("path");
import tl = require("azure-pipelines-task-lib/task");
import { IExecSyncResult } from 'azure-pipelines-task-lib/toolrunner';

export class Utility {

	public static async deployWebApps(
		services: string[],
		resourceGroup: string,
		artifactsPath: string,
		appNameFormat: string,
		appPathFormat: string,
		debug: Boolean): Promise<Boolean> {

		var result: Boolean = true;
		var deployments: Q.Promise<void>[] = [];
		for (let service of services) {
			service = service?.trim();
			if (Utility.isNullOrWhitespace(service)) {
				return;
			}

			let appSource = path.join(artifactsPath, `${service}.zip`);
			if (!Utility.isNullOrWhitespace(appPathFormat)) {
				appSource = Utility.formatString(appPathFormat, artifactsPath, service);
			}
			let appName: string = service;
			if (!Utility.isNullOrWhitespace(appNameFormat)) {
				appName = Utility.formatString(appNameFormat, service);
			}
			// TODO: localization
			console.log(`Started deploying service "${service}".`)
			console.log(`  Application source: ${appSource}`);
			console.log(`  Azure service name: ${appName}`)

			let deployment = tl.exec("az", `webapp deployment source config-zip --resource-group ${resourceGroup} --name ${appName} --src "${appSource}"`)
				.then(
					result => {
						console.log(`${service}: service is deployed.`)
					},
					error => {
						result = false;
						if (debug) {
							console.error(error);
						}
						tl.error(`${service}: failed to deploy service.`);
					}
				);
			deployments.push(deployment);
		}
		await Promise.all(deployments);

		let i: number = 0;
		for (const deployment of deployments) {
			i++;
			if (deployment.isRejected()) {
				console.log(`Service ${i}: REJECTED`)
			} else if (deployment.isFulfilled()) {
				console.log(`Service ${i}: FULFILLED`)
			} else {
				console.log(`Service ${i}: PENDING`)
			}
		}
		return result;
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
