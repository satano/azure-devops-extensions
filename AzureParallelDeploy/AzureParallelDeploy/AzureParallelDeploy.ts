import fs = require("fs");
import path = require("path");
import tl = require("azure-pipelines-task-lib/task");
import { Utility } from "./src/Utility";

export class azureclitask {

	public static async runMain(): Promise<void> {
		var toolExecutionError = null;
		var exitCode: number = 0;
		try {
			var debug: boolean = !!tl.getTaskVariable("System.Debug");

			Utility.throwIfError(tl.execSync("az", "--version"));
			// Set az cli config dir.
			this.setConfigDirectory();
			this.setAzureCloudBasedOnServiceEndpoint();
			var connectedService: string = tl.getInput("ConnectedServiceName", true);
			this.loginAzureRM(connectedService);

			var services: string[] = tl.getDelimitedInput("Services", "\n", true);
			var resourceGroup: string = tl.getInput("ResourceGroup", true);
			var artifactsPath: string = tl.getPathInput("ArtifactsPath", true);
			var appNameFormat: string = tl.getInput("AppNameFormat", true);
			var appPathFormat: string = tl.getInput("AppPathFormat", true);

			console.log("Input parameters");
			console.log("----------------");
			console.log(`services: ${services}`);
			console.log(`resourceGroup: ${resourceGroup}`);
			console.log(`artifactsPath: ${artifactsPath}`);
			console.log(`appNameFormat: ${appNameFormat}`);
			console.log(`appPathFormat: ${appPathFormat}`);
			console.log("----------------");

			const deployTimeLog: string = "All services deployed in";
			console.time(deployTimeLog);
			var result: Boolean = await Utility.deployWebApps(services, resourceGroup, artifactsPath, appNameFormat, appPathFormat, debug);
			console.timeEnd(deployTimeLog);
			if (!result) {
				// TODO: localization
				tl.setResult(tl.TaskResult.Failed, "Deployment of services failed.");
			}
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

			// Set the task result to either succeeded or failed based on error was thrown or not.
			if (toolExecutionError) {
				tl.setResult(tl.TaskResult.Failed, tl.loc("ScriptFailed", toolExecutionError));
			} else if (exitCode != 0) {
				tl.setResult(tl.TaskResult.Failed, tl.loc("ScriptFailedWithExitCode", exitCode));
			}
			else {
				tl.setResult(tl.TaskResult.Succeeded, tl.loc("ScriptReturnCode", 0));
			}

			if (this.isLoggedIn) {
				this.logoutAzure();
			}
		}
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
		var connectedService: string = tl.getInput("connectedServiceNameARM", true);
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

azureclitask.runMain();
