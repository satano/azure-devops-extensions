[CmdletBinding()]
param()

Trace-VstsEnteringInvocation $MyInvocation
try {
	# Get task variables.
	[bool]$debug = Get-VstsTaskVariable -Name System.Debug -AsBool

	# Get the inputs.
	[string[]]$services = Get-VstsInput -Name services
	[string]$resourceGroup = Get-VstsInput -Name resourceGroup
	[string]$artifactsPath = Get-VstsInput -Name artifactsPath
	[string]$appNameFormat = Get-VstsInput -Name appNameFormat
	[string]$appPathFormat = Get-VstsInput -Name appPathFormat
	[bool]$logAllJobs = $debug

	# Import the helpers.
	. $PSScriptRoot/Deploy-Services.ps1 -Services $Services -ResourceGroup $ResourceGroup -ArtifactsPath $ArtifactsPath -AppNameFormat $AppNameFormat -AppPathFormat $AppPathFormat -LogAllJobs:$LogAllJobs
}
finally {
	Trace-VstsLeavingInvocation $MyInvocation
}
