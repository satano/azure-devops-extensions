export class ServiceInfo {
	public static create(data: any): ServiceInfo {
		var parsedData:object = null;
		if (typeof data == "string") {
			var name = (data as string).trim();
			if (name != "") {
				parsedData = { name: name };
			}
		} else if (typeof data == "object") {
			var name:string = typeof data.name == "string" ? data.name.trim() : "";
			var targetService:string = typeof data.targetService == "string" ? data.targetService.trim() : "";
			var sourcePath:string = typeof data.sourcePath == "string" ? data.sourcePath.trim() : "";
			if (name == "") {
				name = targetService;
			}
			parsedData = { name: name, targetService: targetService, sourcePath: sourcePath };
		}
		return  parsedData === null ? null : Object.assign(new ServiceInfo(), parsedData);
	}

	public readonly name: string;
	public readonly targetService: string;
	public readonly sourcePath: string;
}
