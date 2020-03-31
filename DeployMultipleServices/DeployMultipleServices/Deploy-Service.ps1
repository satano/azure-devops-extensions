[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][String]$ResourceGroup,
    [Parameter(Mandatory = $true)][String]$AppName,
    [Parameter(Mandatory = $true)][String]$Source
)

$result = az webapp deployment source config-zip --resource-group $ResourceGroup --name $AppName --src $Source
if (-not $result) {
    throw "Error while deploying service $AppName"
}
