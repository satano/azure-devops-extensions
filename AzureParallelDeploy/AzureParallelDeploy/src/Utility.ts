import tl = require("azure-pipelines-task-lib/task");
import { IExecSyncResult } from 'azure-pipelines-task-lib/toolrunner';

export class Utility {

	public static parseServices(source: string): string[] {
		if (source == null) {
			return [];
		}
		return source.split(/[,;\n\r]/)
			.filter(value => !this.isNullOrWhitespace(value))
			.map(value => this.trimQuotes(value.trim()));
	}

	public static formatString(format: string, ...args: any[]) {
		return format.replace(/{(\d+)}/g, function (match, number) {
			return typeof args[number] != undefined
				? args[number]
				: match;
		});
	}

	public static isNullOrWhitespace(value: string) {
		if ((value === null) || (value === undefined) || (value === "")) {
			return true;
		}
		return value.match(/^\s*$/g) !== null;
	}

	public static trimQuotes(input: string) {
		return this.trimChars(input, "\"\'");
	}

	public static trimChars(input: string, chars: string) {
		if (input == null) {
			return input;
		}
		if (typeof chars == null) {
			chars = '\\s';
		}
		var pattern = '^[' + chars + ']*(.*?)[' + chars + ']*$';
		return input.replace(new RegExp(pattern), '$1');
	}

	public static checkIfAzurePythonSdkIsInstalled() {
		return !!tl.which("az", false);
	}

	public static throwIfError(resultOfToolExecution: IExecSyncResult, errormsg?: string): void {
		if (resultOfToolExecution.stdout != null) {
			console.log(resultOfToolExecution.stdout);
		}
		if (resultOfToolExecution.code != 0) {
			if (errormsg) {
				tl.error("Error: " + errormsg);
			}
			tl.error("Error Code: [" + resultOfToolExecution.code + "]");
			if (resultOfToolExecution.error?.message != null) {
				tl.error(resultOfToolExecution.error.message);
			}
			tl.error(resultOfToolExecution.stderr);
			throw resultOfToolExecution;
		}
	}
}
