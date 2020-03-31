[CmdletBinding()]
param(
	[Parameter(Mandatory = $true)][String[]]$Services,
	[Parameter(Mandatory = $true)][String]$ResourceGroup,
	[Parameter(Mandatory = $true)][String]$ArtifactPath,
	[Parameter(Mandatory = $true)][String]$AppNameFormat,
	[Parameter(Mandatory = $true)][String]$AppPathFormat
)

function Trace-VstsEnteringInvocation {
	Write-Host "`$Services = $Services"
	Write-Host "`$ResourceGroup = $ResourceGroup"
	Write-Host "`$ArtifactPath = $ArtifactPath"
	Write-Host "`$AppNameFormat = $AppNameFormat"
	Write-Host "`$AppPathFormat = $AppPathFormat"
	Write-Host "------------------------------------------------------------"
}
function Trace-VstsLeavingInvocation { }

Trace-VstsEnteringInvocation $MyInvocation
try {
	$jobs = @()
	ForEach ($service in $Services) {
		Write-Host "Started deploying service ""$service"""
		$formatted = ""
		$appName = $service
		if (-not [string]::IsNullOrWhiteSpace($AppNameFormat)) {
			$appName = [string]::Format($AppNameFormat, $service);
			$formatted = " (formatted)"
		}
		Write-Host "  Application name${formatted}: $appName"
		$formatted = ""
		$appSource = "$ArtifactPath/$service.zip"
		if (-not [string]::IsNullOrWhiteSpace($AppPathFormat)) {
			$appSource = [string]::Format($AppPathFormat, $ArtifactPath, $service);
			$formatted = " (formatted)"
		}
		Write-Host "  Application source${formatted}: $appSource"

		$jobs += Start-Job -Name $service -FilePath "$PSScriptRoot/Deploy-Service.ps1" -ArgumentList $ResourceGroup, $appName, $appSource
	}
	Wait-Job -Job $jobs

	$failed = $false
	foreach ($job in $jobs) {
		if ($job.State -eq 'Failed') {
			Write-Host "Error deploying service ""$($job.Name)""" -ForegroundColor Red
			foreach ($errInfo in $job.ChildJobs[0].Error) {
				Write-Host $errInfo.Exception.Message
			}
			$failed = $true
		}
	}

	if ($failed) {
		throw "Error while deploying some services."
	}
}
finally {
	Trace-VstsLeavingInvocation $MyInvocation
}
