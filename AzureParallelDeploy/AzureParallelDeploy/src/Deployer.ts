import path = require("path");
import tl = require("azure-pipelines-task-lib/task");
import { ServiceInfo } from './ServiceInfo'
import { Utility } from "./Utility";

export class Deployer {

	public constructor(
		resourceGroup: string,
		artifactsPath: string,
		appNameFormat: string,
		appPathFormat: string,
		debug: Boolean) {

		this.resourceGroup = resourceGroup;
		this.artifactsPath = artifactsPath;
		this.appNameFormat = appNameFormat;
		this.appPathFormat = appPathFormat;
		this.debug = debug;
	}

	public readonly resourceGroup: string;
	public readonly artifactsPath: string;
	public readonly appNameFormat: string;
	public readonly appPathFormat: string;
	public readonly debug: Boolean;

	public async deployWebApps(services: ServiceInfo[]): Promise<Boolean> {
		var result: Boolean = true;
		var deployments: Q.Promise<void>[] = [];
		for (const service of services) {
			var deploymentInfo: ServiceInfo = this.createDeploymentInfo(service);
			// TODO: localization
			console.log(`Started deploying service "${deploymentInfo.name}".`)
			console.log(`  Service source: ${deploymentInfo.sourcePath}`);
			console.log(`  Azure service name: ${deploymentInfo.targetService}`)

			var azArgs = "webapp deployment source config-zip" +
				` --resource-group ${this.resourceGroup}` +
				` --name ${deploymentInfo.targetService}` +
				` --src "${deploymentInfo.sourcePath}"`;
			let deployment = tl.exec("az", azArgs)
				.then(
					result => {
						console.log(`${deploymentInfo.name}: service is deployed.`)
					},
					error => {
						result = false;
						if (this.debug) {
							console.error(error);
						}
						tl.error(`${deploymentInfo.name}: failed to deploy service.`);
					}
				);
			deployments.push(deployment);
		}
		await Promise.all(deployments);
		return result;
	}

	private createDeploymentInfo(service: ServiceInfo): ServiceInfo {
		var sourcePath: string;
		if (service.sourcePath == "") {
			sourcePath = Utility.isNullOrWhitespace(this.appPathFormat)
				? path.join(this.artifactsPath, `${service.name}.zip`)
				: Utility.formatString(this.appPathFormat, this.artifactsPath, service.name);
		} else {
			sourcePath = path.join(this.artifactsPath, service.sourcePath);
		}

		var targetService: string = service.targetService;
		if (targetService == "") {
			targetService = Utility.isNullOrWhitespace(this.appNameFormat)
				? service.name
				: Utility.formatString(this.appNameFormat, service.name);
		}

		return { name: service.name, targetService: targetService, sourcePath: sourcePath }
	}
}
