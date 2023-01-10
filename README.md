# geohub-azure-functions

This repository is to manage Azure Funcitons for GeoHub application

## setup

- Install Azure function tool

```shell
npm install -g azure-functions-core-tools
```

- create project

```shell
func init geohub-azure-functions
```

- create function

```shell
func new
```

## develop

- set environmental variables

```
cp local.settings.example.json local.settings.json
```

- run locally

```shell
npm start
```
