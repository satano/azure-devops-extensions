import tl = require("azure-pipelines-task-lib/task");
import { AppType, Settings } from './Interfaces'
import { Utility } from "./Utility";

export class Deployer {

	public constructor(settings: Settings, debug: boolean) {
		this.settings = settings;
		this.debug = debug;
	}

	public readonly settings: Settings;
	public readonly debug: boolean;

	public async deployWebApps(services: string[]): Promise<boolean> {
		var deploymentResult: boolean = true;
		var deployments: Q.Promise<void>[] = [];
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
			let deployment = tl.exec("az", azArgs)
				.then(
					result => {
						deployedServices.push(targetService);
						console.log(`${service}: ${tl.loc("DeployingServiceOk")}`)
					},
					error => {
						deploymentResult = false;
						if (this.debug) {
							Utility.logError(error);
						}
						tl.error(`${service}: ${tl.loc("DeployingServiceError")}`);
					}
				);
			deployments.push(deployment);
		});
		await Promise.all(deployments);
		if (this.settings.appType == AppType.FunctionApp) {
			if (deploymentResult) {
				console.log("Invoking 'SyncFunctionTriggers' action.")
				deploymentResult = this.syncFunctionTriggers(deployedServices);
			} else {
				console.log("'SyncFunctionTriggers' action will not be invoked, because not all services were deployed.")
			}
		}

		return deploymentResult;
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
			tl.error("Sync function triggers action failed.");
			tl.error(`Error Code: [${result.code}]`);
			if (result.error?.message != null) {
				tl.error(result.error.message);
			}
			tl.error(result.stderr);
			return false;
		}

		console.log("Sync function triggers action invoked successfully.");
		return true;
	}

	private hasSlot(): boolean {
		return !Utility.isNullOrWhitespace(this.settings.slotName);
	}
}
