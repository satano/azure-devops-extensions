## Description

This extension provides a helper task for [SonarCloud](https://sonarcloud.io).

[SonarCloud extension](https://marketplace.visualstudio.com/items?itemName=SonarSource.sonarcloud)
does not work for .NET Core (C#) projects behind corporate proxy. The issue is discussed on SonarSource community:

- [SonarCloud tasks in Azure DevOps build pipeline do not work with C# projects behind the corporate proxy](https://community.sonarsource.com/t/sonarcloud-tasks-in-azure-devops-build-pipeline-do-not-work-with-c-projects-behind-the-corporate-proxy/15693)
- [Latest version of SonarCloud DevOps tasks (current do not work behind corporate proxy)](https://community.sonarsource.com/t/latest-version-of-sonarcloud-devops-tasks-current-do-not-work-behind-corporate-proxy/19371)

As described in [this working concept](https://community.sonarsource.com/t/latest-version-of-sonarcloud-devops-tasks-current-do-not-work-behind-corporate-proxy/19371/3),
the *SonarCloud Prepare* extension works correctly when the libraries are replaced with the .NET Core build.
And that's, what this extension is doing. It just replaces files in original *SonarCloud Prepare* extension.
The files are replaced with .NET Core build (`netcoreapp3.0`) of original [Sonar Scanner for MSBuild](https://github.com/SonarSource/sonar-scanner-msbuild)
repository. The libraries were built from commit [`10eeb6638833bf74d61869841ac706c79eb10f26`](https://github.com/SonarSource/sonar-scanner-msbuild/tree/10eeb6638833bf74d61869841ac706c79eb10f26).

## Usage

The usage is very simple, just add this task as step in pipeline before the *SonarCloud Prepare* task.
`UseNetCoreSonarCloud` works only for **MSBuild** scanner mode of *SonarCloud Prepare*.

``` yaml
- task: UseNetCoreSonarCloud@1

- task: SonarCloudPrepare@1
  inputs:
    SonarCloud: 'service-connection'
    scannerMode: 'MSBuild'
    organization: 'org-key'
    projectKey: 'project-key'
```
