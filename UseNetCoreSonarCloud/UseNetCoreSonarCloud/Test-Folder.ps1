function Test-Folder {
	[CmdletBinding()]
	param(
		[Parameter(Mandatory = $true)][string]$Path
	)

	if (Test-Path -LiteralPath $Path -PathType Container) {
		return $true
	}
	Write-Warning -Message "Folder does not exist: $Path"
	return $false
}
