[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][String]$ResourceGroup,
    [Parameter(Mandatory = $true)][String]$AppName,
    [Parameter(Mandatory = $true)][String]$AppSource
)

az webapp deployment source config-zip --resource-group $ResourceGroup --name $AppName --src $AppSource
if ($LASTEXITCODE -ne 0) {
    throw "Error while deploying service $AppName"
}
