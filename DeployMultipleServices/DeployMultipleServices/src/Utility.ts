import tl = require("azure-pipelines-task-lib/task");
import { IExecSyncResult } from 'azure-pipelines-task-lib/toolrunner';

export class Utility {

	public static checkIfAzureSdkIsInstalled() {
		return !!tl.which("az", false);
	}

	public static throwIfError(resultOfToolExecution: IExecSyncResult, errormsg?: string): void {
		if (resultOfToolExecution.code != 0) {
			tl.error("Error Code: [" + resultOfToolExecution.code + "]");
			if (errormsg) {
				tl.error("Error: " + errormsg);
			}
			throw resultOfToolExecution;
		}
	}
}
