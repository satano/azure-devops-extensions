export enum AppType {
	WebApp = "WebApp",
	FunctionApp = "FunctionApp"
}

export interface Settings {
	appType: AppType;
	resourceGroup: string;
	appNameFormat: string;
	appSourceFormat: string;
	appSourceBasePath: string;
	slotName: string;
}
