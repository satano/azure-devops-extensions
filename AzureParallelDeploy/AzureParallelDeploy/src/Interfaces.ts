export enum AppType {
	WebApp = "WebApp",
	FunctionApp = "FunctionApp"
}

export interface Settings {
	appType: AppType;
	resourceGroup: string;
	appSourceBasePath: string;
	appNameFormat: string;
	appSourceFormat: string;
	slotName: string;
}
