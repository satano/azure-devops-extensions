import tl = require("azure-pipelines-task-lib/task");
import { AppType, Settings } from "./Interfaces";
import { Utility } from "./Utility";

export class Deployer {

	public constructor(settings: Settings, debug: boolean) {
		this.settings = settings;
		this.debug = debug;
	}

	public readonly settings: Settings;
	public readonly debug: boolean;

	private readonly retryCount: Map<string, number> = new Map<string, number>();
	private static readonly maxRetries = 3;

	private static readonly retryDelayInMilliseconds = 3000;

	public async deployWebApps(services: string[]): Promise<boolean> {
		var deploymentResult: boolean = true;
		var deployments: Promise<any>[] = [];
		var deployedServices: string[] = [];
		var azSlotNameArg = this.hasSlot() ? ` --slot ${this.settings.slotName}` : "";

		console.log(tl.loc("DeployingServices"));
		console.log(tl.loc("DeployingServicesBaseFolder", this.settings.appSourceBasePath));
		console.log("");

		services.forEach(service => {
			service = service.trim();
			if (service == "") {
				return;
			}
			let targetService = Utility.formatString(this.settings.appNameFormat, service);
			let sourceFileName = Utility.formatString(this.settings.appSourceFormat, service);

			console.log("");
			console.log(tl.loc("DeployingServiceStart", service));
			console.log(tl.loc("DeployingServiceFilename", sourceFileName));
			console.log(tl.loc("DeployingServiceAzureName", targetService));

			var sourceFiles = tl.findMatch(this.settings.appSourceBasePath, `**/${sourceFileName}`);
			if (sourceFiles.length == 0) {
				deploymentResult = false;
				Utility.logError(tl.loc("DeployingServiceNoSourceFile", sourceFileName, service));
				return;
			} else if (sourceFiles.length > 1) {
				deploymentResult = false;
				Utility.logError(tl.loc("DeployingServiceMoreSourceFiles", sourceFileName, service));
				for (const file of sourceFiles) {
					console.error(`  - ${file}`);
				}
				return;
			}
			console.log(tl.loc("DeployingServiceUsingSourceFile", sourceFiles[0]));

			let command = this.settings.appType == AppType.FunctionApp ? "functionapp" : "webapp";
			let azArgs = `${command} deployment source config-zip`
				+ ` --resource-group ${this.settings.resourceGroup}`
				+ ` --name ${targetService}${azSlotNameArg}`
				+ ` --src "${sourceFiles[0]}"`;

			this.retryCount[service] = 0;

			let deployment = this.ExecuteDeployment(azArgs, service, targetService, deployedServices);
			deployments.push(deployment);
		});
		await Promise.allSettled(deployments).then(results => {
			console.log(results);
			deploymentResult = (results.filter(result => { return result.status != "fulfilled"}).length == 0);
		});

		if (this.settings.appType == AppType.FunctionApp) {
			if (deploymentResult && this.settings.syncFunctionTriggers) {
				console.log(tl.loc("SyncFunctionTriggersInvoking"))
				deploymentResult = this.syncFunctionTriggers(deployedServices);
			} else {
				console.log(tl.loc("SyncFunctionTriggersNotInvoking"))
			}
		}

		return deploymentResult;
	}

	private async ExecuteDeployment(
		azArgs: string,
		service: string,
		targetService: string,
		deployedServices: string[]): Promise<any> {

		var retryCount = this.retryCount[service];
		if (retryCount > 0) {
			await this.delay(retryCount * Deployer.retryDelayInMilliseconds)
		}

		return tl.exec("az", azArgs).then(
			_ => {
				deployedServices.push(targetService);
				console.log(`${service}: ${tl.loc("DeployingServiceOk")}`);
			},
			error => {
				this.retryCount[service]++;
				retryCount = this.retryCount[service];
				if (retryCount <= Deployer.maxRetries) {
					console.log(`${service}: ${tl.loc("DeployServiceRetry", retryCount)}`);

					if (this.debug) {
						Utility.logError(error);
					}

					return new Promise((resolve) => setTimeout(() => {
						resolve(this.ExecuteDeployment(azArgs, service, targetService, deployedServices));
					}, 100));
				} else {
					let message = `${service}: ${tl.loc("DeployingServiceError")}`;
					tl.error(message);
					throw message;
				}
			}
		);
	}

	private syncFunctionTriggers(services: string[]): boolean {
		var serviceIds = services.map(value => `/subscriptions/${this.settings.subscriptionId}/resourceGroups/`
			+ `${this.settings.resourceGroup}/providers/Microsoft.Web/sites/${value}`);
		if (this.hasSlot()) {
			serviceIds = serviceIds.map(value => `${value}/slots/${this.settings.slotName}`);
		}
		var azArgs: string[] = ["resource", "invoke-action", "--verbose", "--action", "syncfunctiontriggers", "--ids"];
		serviceIds.forEach(value => azArgs.push(value));

		var result = tl.execSync("az", azArgs);
		if (result.code != 0) {
			tl.error(tl.loc("SyncFunctionTriggersFailed"));
			tl.error(`Error Code: [${result.code}]`);
			if (result.error?.message != null) {
				tl.error(result.error.message);
			}
			tl.error(result.stderr);
			return false;
		}

		console.log(tl.loc("SyncFunctionTriggersSucceeded"));
		return true;
	}

	private hasSlot(): boolean {
		return !Utility.isNullOrWhitespace(this.settings.slotName);
	}

	private delay(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}
