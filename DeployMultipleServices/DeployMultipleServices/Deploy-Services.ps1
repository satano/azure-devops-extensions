[CmdletBinding()]
param(
	[Parameter(Mandatory = $true)][string[]]$Services,
	[Parameter(Mandatory = $true)][string]$ResourceGroup,
	[Parameter(Mandatory = $true)][string]$ArtifactsPath,
	[Parameter(Mandatory = $true)][string]$AppNameFormat,
	[Parameter(Mandatory = $true)][string]$AppPathFormat,
	[Parameter(Mandatory = $false)][switch]$LogAllJobs
)

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
		$appSource = "$ArtifactsPath/$service.zip"
		if (-not [string]::IsNullOrWhiteSpace($AppPathFormat)) {
			$appSource = [string]::Format($AppPathFormat, $ArtifactsPath, $service);
			$formatted = " (formatted)"
		}
		Write-Host "  Application source${formatted}: $appSource"

		$jobs += Start-Job -Name $service -FilePath "$PSScriptRoot/Deploy-Service.ps1" -ArgumentList $ResourceGroup, $appName, $appSource | Out-Null
	}
	Wait-Job -Job $jobs

	$failed = $false
	foreach ($job in $jobs) {
		if ($job.State -eq 'Failed') {
			Write-Host "Error deploying service ""$($job.Name)""" -ForegroundColor Red
			foreach ($errInfo in $job.ChildJobs[0].Error) {
				$msg = $errInfo.Exception.Message
				if ($msg.StartsWith("ERROR", "OrdinalIgnoreCase")) {
					Write-Error $msg
					# $host.UI.WriteErrorLine($msg)
				}
				elseif ($msg.StartsWith("WARNING", "OrdinalIgnoreCase")) {
					Write-Warning $msg
					# $host.UI.WriteWarningLine($msg)
				}
				else {
					Write-Host $msg
				}
				$failed = $true;
			}
		}
		elseif ($LogAllJobs) {
			Write-Host "Job result for service ""$($job.Name)"""
			Receive-Job $job
		}
	}

	if ($failed) {
		throw "Error while deploying some services."
	}
}
finally {
	Trace-VstsLeavingInvocation $MyInvocation
}
