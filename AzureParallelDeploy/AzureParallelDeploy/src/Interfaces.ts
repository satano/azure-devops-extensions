export enum AppType {
	WebApp = "WebApp",
	FunctionApp = "FunctionApp"
}

export interface DeploymentInfo {
	name: string;
	targetService: string;
	sourcePath: string;
}

export interface Settings {
	appType: AppType;
	resourceGroup: string;
	artifactsPath: string;
	appNameFormat: string;
	appPathFormat: string;
	slotName: string;
}
