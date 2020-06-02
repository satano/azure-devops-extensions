import path = require("path");
import tl = require("azure-pipelines-task-lib/task");
import { AppType, ServiceInfo, Settings } from './Interfaces'
import { Utility } from "./Utility";

export class Deployer {

	public constructor(settings: Settings, debug: boolean) {
		this.settings = settings;
		this.debug = debug;
	}

	public readonly settings: Settings;
	public readonly debug: boolean;

	public async deployWebApps(services: ServiceInfo[]): Promise<boolean> {
		var result: boolean = true;
		var deployments: Q.Promise<void>[] = [];

		services.forEach((service: ServiceInfo, index: number, array: ServiceInfo[]) => {
			var deploymentInfo: ServiceInfo = this.createDeploymentInfo(service);
			// TODO: localization
			console.log(`Started deploying service "${deploymentInfo.name}".`)
			console.log(`  Service source: ${deploymentInfo.sourcePath}`);
			console.log(`  Azure service name: ${deploymentInfo.targetService}`)

			var command = this.settings.appType == AppType.FunctionApp ? "functionapp" : "webapp";
			var slotNameParam = Utility.isNullOrWhitespace(this.settings.slotName)
				? ""
				: ` --slot ${this.settings.slotName}`;
			var azArgs = `${command} deployment source config-zip` +
				` --resource-group ${this.settings.resourceGroup}` +
				` --name ${deploymentInfo.targetService}${slotNameParam}` +
				` --src "${deploymentInfo.sourcePath}"`;
			let deployment = tl.exec("az", azArgs)
				.then(
					result => {
						console.log(`${deploymentInfo.name}: Service is deployed.`)
					},
					error => {
						result = false;
						if (this.debug) {
							console.error(error);
						}
						tl.error(`${deploymentInfo.name}: Failed to deploy service.`);
					}
				);
			deployments.push(deployment);
		});
		await Promise.all(deployments);
		return result;
	}

	private createDeploymentInfo(service: ServiceInfo): ServiceInfo {
		var sourcePath: string;
		if (service.sourcePath == "") {
			sourcePath = Utility.isNullOrWhitespace(this.settings.appPathFormat)
				? path.join(this.settings.artifactsPath, `${service.name}.zip`)
				: Utility.formatString(this.settings.appPathFormat, this.settings.artifactsPath, service.name);
		} else {
			sourcePath = path.join(this.settings.artifactsPath, service.sourcePath);
		}

		var targetService: string = service.targetService;
		if (targetService == "") {
			targetService = Utility.isNullOrWhitespace(this.settings.appNameFormat)
				? service.name
				: Utility.formatString(this.settings.appNameFormat, service.name);
		}

		return { name: service.name, targetService: targetService, sourcePath: sourcePath }
	}
}
