import path = require("path");
import tl = require("azure-pipelines-task-lib/task");
import { AppType, DeploymentInfo, Settings } from './Interfaces'
import { Utility } from "./Utility";

export class Deployer {

	public constructor(settings: Settings, debug: boolean) {
		this.settings = settings;
		this.debug = debug;
	}

	public readonly settings: Settings;
	public readonly debug: boolean;

	public async deployWebApps(services: string[]): Promise<boolean> {
		var result: boolean = true;
		var deployments: Q.Promise<void>[] = [];

		services.forEach(service => {
			var deploymentInfo: DeploymentInfo = this.createDeploymentInfo(service);
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

	private createDeploymentInfo(service: string): DeploymentInfo {
		var sourcePath: string = Utility.isNullOrWhitespace(this.settings.appSourceFormat)
			? `${service}.zip`
			: Utility.formatString(this.settings.appSourceFormat, service);
		sourcePath = path.join(this.settings.appSourceBasePath, sourcePath)
		var targetService: string = Utility.isNullOrWhitespace(this.settings.appNameFormat)
			? service
			: Utility.formatString(this.settings.appNameFormat, service);

		return { name: service, targetService: targetService, sourcePath: sourcePath }
	}
}
