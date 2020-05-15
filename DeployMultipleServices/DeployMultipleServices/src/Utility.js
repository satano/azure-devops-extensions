"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tl = require("azure-pipelines-task-lib/task");
class Utility {
    static checkIfAzureSdkIsInstalled() {
        return !!tl.which("az", false);
    }
    static throwIfError(resultOfToolExecution, errormsg) {
        if (resultOfToolExecution.code != 0) {
            tl.error("Error Code: [" + resultOfToolExecution.code + "]");
            if (errormsg) {
                tl.error("Error: " + errormsg);
            }
            throw resultOfToolExecution;
        }
    }
}
exports.Utility = Utility;
