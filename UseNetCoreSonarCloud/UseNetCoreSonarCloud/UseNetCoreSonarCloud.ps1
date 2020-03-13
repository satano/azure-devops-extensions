[CmdletBinding()]
param()

Trace-VstsEnteringInvocation $MyInvocation
try {
	# Import the helpers.
	. $PSScriptRoot/Test-Folder.ps1
	. $PSScriptRoot/Find-SonarCloudTaskPath.ps1

	$agentWorkFolder = Get-VstsTaskVariable -Name Agent.WorkFolder
	$sonarCloudFolder = Find-SonarCloudTaskPath -WorkFolder $agentWorkFolder
	if (-not $sonarCloudFolder) {
		throw "Did not find SonarCloudPrepare task folder."
	}

	$sourceFolder = Join-Path -Path $PSScriptRoot -ChildPath "SonarCloud"
	Write-Host "Copying SonarCloudPrepare libs from '$sourceFolder' to '$sonarCloudFolder'."
	Copy-Item -Path ($sourceFolder + "/*") -Destination $sonarCloudFolder -Force -Verbose

	$buildFolder = Get-VstsTaskVariable -Name Agent.BuildDirectory
	$sonarCubeFolder = Join-Path -Path $buildFolder -ChildPath ".sonarqube/bin"
	$sonarCubeFileName = "SonarScanner.MSBuild.Common.dll"
	$sonarCubeFile = Join-Path -Path $sourceFolder -ChildPath $sonarCubeFileName
	Write-Host "Copying '$sonarCubeFile' file to '$sonarCubeFolder'."
	Copy-Item -Path $sourceFolder -Destination $sonarCloudFolder -Force -Verbose
} finally {
	Trace-VstsLeavingInvocation $MyInvocation
}
