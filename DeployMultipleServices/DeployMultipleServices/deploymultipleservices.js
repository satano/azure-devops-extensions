"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const tl = require("azure-pipelines-task-lib/task");
const Utility_1 = require("./src/Utility");
class azureclitask {
    static runMain() {
        return __awaiter(this, void 0, void 0, function* () {
            var toolExecutionError = null;
            var exitCode = 0;
            try {
                Utility_1.Utility.throwIfError(tl.execSync("az", "--version"));
                // Set az cli config dir.
                this.setConfigDirectory();
                this.setAzureCloudBasedOnServiceEndpoint();
                var connectedService = tl.getInput("connectedServiceNameARM", true);
                this.loginAzureRM(connectedService);
                console.log('Listing resource groups:');
                Utility_1.Utility.throwIfError(tl.execSync("az", `group list`));
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
                }
                else if (exitCode != 0) {
                    tl.setResult(tl.TaskResult.Failed, tl.loc("ScriptFailedWithExitCode", exitCode));
                }
                else {
                    tl.setResult(tl.TaskResult.Succeeded, tl.loc("ScriptReturnCode", 0));
                }
                if (this.isLoggedIn) {
                    this.logoutAzure();
                }
            }
        });
    }
    static loginAzureRM(connectedService) {
        var authScheme = tl.getEndpointAuthorizationScheme(connectedService, true);
        var subscriptionID = tl.getEndpointDataParameter(connectedService, "SubscriptionID", true);
        if (authScheme.toLowerCase() == "serviceprincipal") {
            let authType = tl.getEndpointAuthorizationParameter(connectedService, 'authenticationType', true);
            let cliPassword = null;
            var servicePrincipalId = tl.getEndpointAuthorizationParameter(connectedService, "serviceprincipalid", false);
            var tenantId = tl.getEndpointAuthorizationParameter(connectedService, "tenantid", false);
            if (authType == "spnCertificate") {
                tl.debug('certificate based endpoint');
                let certificateContent = tl.getEndpointAuthorizationParameter(connectedService, "servicePrincipalCertificate", false);
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
            Utility_1.Utility.throwIfError(tl.execSync("az", `login --service-principal -u "${servicePrincipalId}" -p "${escapedCliPassword}" --tenant "${tenantId}"`), tl.loc("LoginFailed"));
        }
        else if (authScheme.toLowerCase() == "managedserviceidentity") {
            // Login using msi.
            Utility_1.Utility.throwIfError(tl.execSync("az", "login --identity"), tl.loc("MSILoginFailed"));
        }
        else {
            throw tl.loc('AuthSchemeNotSupported', authScheme);
        }
        this.isLoggedIn = true;
        // Set the subscription imported to the current subscription.
        Utility_1.Utility.throwIfError(tl.execSync("az", "account set --subscription \"" + subscriptionID + "\""), tl.loc("ErrorInSettingUpSubscription"));
    }
    static setConfigDirectory() {
        if (!!tl.getVariable('Agent.TempDirectory')) {
            var azCliConfigPath = path.join(tl.getVariable('Agent.TempDirectory'), ".azclitask");
            console.log(tl.loc('SettingAzureConfigDir', azCliConfigPath));
            process.env['AZURE_CONFIG_DIR'] = azCliConfigPath;
        }
        else {
            console.warn(tl.loc('GlobalCliConfigAgentVersionWarning'));
        }
    }
    static setAzureCloudBasedOnServiceEndpoint() {
        var connectedService = tl.getInput("connectedServiceNameARM", true);
        var environment = tl.getEndpointDataParameter(connectedService, 'environment', true);
        if (!!environment) {
            console.log(tl.loc('SettingAzureCloud', environment));
            Utility_1.Utility.throwIfError(tl.execSync("az", "cloud set -n " + environment));
        }
    }
    static logoutAzure() {
        try {
            tl.execSync("az", " account clear");
        }
        catch (err) {
            // task should not fail if logout doesn`t occur
            tl.warning(tl.loc("FailedToLogout"));
        }
    }
}
exports.azureclitask = azureclitask;
azureclitask.isLoggedIn = false;
azureclitask.cliPasswordPath = null;
tl.setResourcePath(path.join(__dirname, "task.json"));
if (!Utility_1.Utility.checkIfAzureSdkIsInstalled()) {
    tl.setResult(tl.TaskResult.Failed, tl.loc("AzureSDKNotFound"));
}
azureclitask.runMain();
