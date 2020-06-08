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
		var result: boolean = true;
		var deployments: Q.Promise<void>[] = [];

		console.log(`Deploying services...`);
		console.log(`Base folder for services' source files is: "${this.settings.appSourceBasePath}"`);
		console.log("");

		services.forEach(service => {
			service = service.trim();
			var targetService = Utility.formatString(this.settings.appNameFormat, service);
			var sourceFileName = Utility.formatString(this.settings.appSourceFormat, service);

			// TODO: localization
			console.log("");
			console.log(`Started deploying service "${service}".`)
			console.log(`  Service source filename: ${sourceFileName}`);
			console.log(`  Azure service name: ${targetService}`)

			var sourceFiles = tl.findMatch(this.settings.appSourceBasePath, `**/${sourceFileName}`);
			if (sourceFiles.length == 0) {
				result = false;
				Utility.logError(`Did not find source file "${sourceFileName}" for service "${service}".`);
				return;
			} else if (sourceFiles.length > 1) {
				result = false;
				Utility.logError(`Found more than one source file "${sourceFileName}" for service "${service}".`);
				for (const file of sourceFiles) {
					console.error(`  - ${file}`);
				}
				return;
			}
			console.log(`Using source file: ${sourceFiles[0]}`);

			var command = this.settings.appType == AppType.FunctionApp ? "functionapp" : "webapp";
			var slotNameParam = Utility.isNullOrWhitespace(this.settings.slotName)
				? ""
				: ` --slot ${this.settings.slotName}`;
			var azArgs = `${command} deployment source config-zip` +
				` --resource-group ${this.settings.resourceGroup}` +
				` --name ${targetService}${slotNameParam}` +
				` --src "${sourceFiles[0]}"`;
			let deployment = tl.exec("az", azArgs)
				.then(
					result => {
						console.log(`${service}: Service is deployed.`)
					},
					error => {
						result = false;
						if (this.debug) {
							Utility.logError(error);
						}
						tl.error(`${service}: Failed to deploy service.`);
					}
				);
			deployments.push(deployment);
		});
		await Promise.all(deployments);
		return result;
	}
}
