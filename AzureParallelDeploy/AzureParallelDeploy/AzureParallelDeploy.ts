import fs = require("fs");
import path = require("path");
import tl = require("azure-pipelines-task-lib/task");
import { Utility } from "./src/Utility";
import { Deployer } from "./src/Deployer";
import { AppType, Settings } from "./src/Interfaces";

export class azureparalleldeploytask {

	private static DefaultAppNameFormat: string = "{0}";
	private static DefaultAppSourceFormat: string = "{0}.zip";

	public static async runMain(): Promise<void> {
		var deploymentResult: boolean = undefined;
		var toolExecutionError = null;
		try {
			Utility.throwIfError(tl.execSync("az", "--version"));
			// Set az cli config dir.
			this.setConfigDirectory();
			this.setAzureCloudBasedOnServiceEndpoint();
			var connectedService: string = tl.getInput("ConnectedServiceName", true);
			this.loginAzureRM(connectedService);

			var debug: boolean = !!tl.getTaskVariable("System.Debug");
			var settings = this.loadSettings();
			var servicesRaw: string = tl.getInput("Services", true);
			var services: string[] = tl.getDelimitedInput("Services", "\n");
			console.log(`Services: "${servicesRaw}"`)

			const deployTimeLog: string = "All services deployed in";
			console.time(deployTimeLog);
			var deployer = new Deployer(settings, debug);
			deploymentResult = await deployer.deployWebApps(services);
			console.timeEnd(deployTimeLog);
		}
		catch (err) {
			toolExecutionError = err;
			if (err.stderr) {
				toolExecutionError = err.stderr;
			}
		}
		finally {
			if (this.cliPasswordPath) {
				tl.debug('Removing spn certificate file');
				tl.rmRF(this.cliPasswordPath);
			}

			if (toolExecutionError) {
				tl.setResult(tl.TaskResult.Failed, tl.loc("ScriptFailed", toolExecutionError));
			} else if (deploymentResult === true) {
				// TODO: localization
				tl.setResult(tl.TaskResult.Succeeded, "All services were deployed.");
			} else {
				tl.setResult(tl.TaskResult.Failed, "Services were not deployed.");
			}

			if (this.isLoggedIn) {
				this.logoutAzure();
			}
		}
	}

	private static loadSettings(): Settings {
		const defaultValueUsed = " (parameter not set, using default value)";
		const defaultWorkingDirectoryUsed = " (parameter not set, using 'System.DefaultWorkingDirectory')";
		console.log("Initializing settings...")

		var additionalInfo: string = "";
		var appTypeStr = tl.getInput("AppType", false);
		var appType: AppType = AppType[appTypeStr];
		if (appType == undefined) {
			appType = AppType.WebApp;
			additionalInfo = defaultValueUsed;
		}
		console.log(`AppType: ${appType}${additionalInfo}`)

		var resourceGroup: string = tl.getInput("ResourceGroup", true);
		console.log(`ResourceGroup: ${resourceGroup}`)

		additionalInfo = "";
		var appNameFormat: string = tl.getInput("AppNameFormat", false);
		if (Utility.isNullOrWhitespace(appNameFormat)) {
			appNameFormat = azureparalleldeploytask.DefaultAppNameFormat;
			additionalInfo = defaultValueUsed;
		}
		console.log(`AppNameFormat: ${appNameFormat}${additionalInfo}`)

		additionalInfo = "";
		var appSourceFormat: string = tl.getInput("AppSourceFormat", false);
		if (Utility.isNullOrWhitespace(appSourceFormat)) {
			appSourceFormat = azureparalleldeploytask.DefaultAppSourceFormat;
			additionalInfo = defaultValueUsed;
		}
		console.log(`AppSourceFormat: ${appSourceFormat}${additionalInfo}`)

		additionalInfo = "";
		var appSourceBasePath: string = tl.getPathInput("AppSourceBasePath", false);
		if (Utility.isNullOrWhitespace(appSourceBasePath)) {
			appSourceBasePath = tl.getVariable("System.DefaultWorkingDirectory");
			additionalInfo = defaultWorkingDirectoryUsed;
		}
		console.log(`AppSourceBasePath: "${appSourceBasePath}"${additionalInfo}`)

		var slotName: string = tl.getInput("SlotName", false);
		if (slotName == null) {
			slotName = "";
		}
		console.log(`SlotName: ${slotName}`)

		return {
			appType: appType,
			resourceGroup: resourceGroup,
			appSourceBasePath: appSourceBasePath,
			appNameFormat: appNameFormat,
			appSourceFormat: appSourceFormat,
			slotName: slotName
		};
	}

	private static isLoggedIn: boolean = false;
	private static cliPasswordPath: string = null;

	private static loginAzureRM(connectedService: string): void {
		var authScheme: string = tl.getEndpointAuthorizationScheme(connectedService, true);
		var subscriptionID: string = tl.getEndpointDataParameter(connectedService, "SubscriptionID", true);

		if (authScheme.toLowerCase() == "serviceprincipal") {
			let authType: string = tl.getEndpointAuthorizationParameter(connectedService, 'authenticationType', true);
			let cliPassword: string = null;
			var servicePrincipalId: string = tl.getEndpointAuthorizationParameter(connectedService, "serviceprincipalid", false);
			var tenantId: string = tl.getEndpointAuthorizationParameter(connectedService, "tenantid", false);

			if (authType == "spnCertificate") {
				tl.debug('certificate based endpoint');
				let certificateContent: string = tl.getEndpointAuthorizationParameter(connectedService, "servicePrincipalCertificate", false);
				cliPassword = path.join(tl.getVariable('Agent.TempDirectory') || tl.getVariable('system.DefaultWorkingDirectory'), 'spnCert.pem');
				fs.writeFileSync(cliPassword, certificateContent);
				this.cliPasswordPath = cliPassword;
			}
			else {
				tl.debug('key based endpoint');
				cliPassword = tl.getEndpointAuthorizationParameter(connectedService, "serviceprincipalkey", false);
			}

			let escapedCliPassword = cliPassword.replace(/"/g, '\\"');
			tl.setSecret(escapedCliPassword.replace(/\\/g, '\"'));
			// Login using svn.
			Utility.throwIfError(tl.execSync("az", `login --service-principal -u "${servicePrincipalId}" -p "${escapedCliPassword}" --tenant "${tenantId}"`), tl.loc("LoginFailed"));
		}
		else if (authScheme.toLowerCase() == "managedserviceidentity") {
			// Login using msi.
			Utility.throwIfError(tl.execSync("az", "login --identity"), tl.loc("MSILoginFailed"));
		}
		else {
			throw tl.loc('AuthSchemeNotSupported', authScheme);
		}

		this.isLoggedIn = true;
		// Set the subscription imported to the current subscription.
		Utility.throwIfError(tl.execSync("az", "account set --subscription \"" + subscriptionID + "\""), tl.loc("ErrorInSettingUpSubscription"));
	}

	private static setConfigDirectory(): void {
		if (!!tl.getVariable('Agent.TempDirectory')) {
			var azCliConfigPath = path.join(tl.getVariable('Agent.TempDirectory'), ".azclitask");
			console.log(tl.loc('SettingAzureConfigDir', azCliConfigPath));
			process.env['AZURE_CONFIG_DIR'] = azCliConfigPath;
		} else {
			console.warn(tl.loc('GlobalCliConfigAgentVersionWarning'));
		}
	}

	private static setAzureCloudBasedOnServiceEndpoint(): void {
		var connectedService: string = tl.getInput("ConnectedServiceName", true);
		var environment = tl.getEndpointDataParameter(connectedService, 'environment', true);
		if (!!environment) {
			console.log(tl.loc('SettingAzureCloud', environment));
			Utility.throwIfError(tl.execSync("az", "cloud set -n " + environment));
		}
	}

	private static logoutAzure() {
		try {
			tl.execSync("az", " account clear");
		}
		catch (err) {
			// task should not fail if logout doesn`t occur
			tl.warning(tl.loc("FailedToLogout"));
		}
	}
}

tl.setResourcePath(path.join(__dirname, "task.json"));

if (!Utility.checkIfAzurePythonSdkIsInstalled()) {
	tl.setResult(tl.TaskResult.Failed, tl.loc("AzureSDKNotFound"));
}

azureparalleldeploytask.runMain();
