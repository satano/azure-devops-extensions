function Find-SonarCloudTaskPath {
	[CmdletBinding()]
	param(
		[Parameter(Mandatory = $true)][string]$WorkFolder
	)

	Trace-VstsEnteringInvocation $MyInvocation
	try {
		$resolvedPath = Resolve-Path -Path $WorkFolder
		$tasksFolder = Join-Path -Path $resolvedPath -ChildPath "_tasks"
		Write-Host "Seraching for SonarCloudPrepare task folder in: $tasksFolder"
		if (-not (Test-Folder -Path $tasksFolder)) {
			return
		}

		$taskBaseFolder = Get-ChildItem -Path $tasksFolder -Filter "SonarCloudPrepare*" -Directory
		if (-not $taskBaseFolder) {
			Write-Warning -Message "SonarCloudPrepare task was not found in tasks folder: $tasksFolder"
			return
		}
		if ($taskBaseFolder.Length -gt 1) {
			$taskBaseFolder = $taskBaseFolder[0]
			Write-Warning "More than one SonarCloudPrepare task was found. Using the first one."
		}
		$taskBaseFolder = $taskBaseFolder.FullName
		Write-Host "Found SonarCloudPrepare task folder: $taskBaseFolder"

		$taskVersionFolder = Get-ChildItem -Path $taskBaseFolder -Directory `
		| Where-Object -Property Name -Match "^\d+.\d+.\d+$" `
		| Sort-Object -Property Name -Descending `
		| Select-Object -First 1

		if (-not $taskVersionFolder) {
			Write-Warning "Did not find version folder in SonarCloudPrepare task folder: $taskBaseFolder"
			return
		}
		$taskVersionFolder = $taskVersionFolder.FullName
		$targetFolder = Join-Path -Path $taskVersionFolder -ChildPath "classic-sonar-scanner-msbuild"
		Write-Host "Found SonarCloudPrepare version folder: $taskVersionFolder"
		Write-Host "Using target folder: $targetFolder"
		if (-not ( Test-Folder -Path $targetFolder )) {
			return
		}

		return $targetFolder
	}
	finally {
		Trace-VstsLeavingInvocation $MyInvocation
	}
}
