# Azure Parallel Deploy task

## Usage

If you are using a UI, add **Azure Parallel Deploy** task from the **Deploy** category and configure it as needed:

![Azure Parallel Deploy settings][settings]

If you are using YAML pipeline, add task with the following syntax:

``` yml
steps:
- task: AzureParallelDeploy@1
  displayName: 'Deploy services'
  inputs:
    ConnectedServiceName: 'Gabo-KROS'
    ResourceGroup: 'ServiceDeployment'
    Services: 'api1, api2, api3'
    AppNameFormat: 'sp-servicedeployment-{0}'
```

This YAML syntax is for simple use, where `Services` input is set directly in the task. But you may want to use service names as list and not simple string. For example when the service names are set using [runtime parameter][pipeline parameters]. It is convenient to have this parameter as YAML list (parameter type `object`), because it can be used byin several ways, for example you can enumerate the list's values in the pipeline.

## Task parameters

[settings]: https://raw.githubusercontent.com/satano/azure-devops-extensions/DeployAsync/AzureParallelDeploy/images/azure-parallel-deploy.png
[pipeline parameters]: https://docs.microsoft.com/en-us/azure/devops/pipelines/process/runtime-parameters
