## Classifier
Classify (label) a folder full of images or enrich a csv with Entity Extraction.

Writes to a csv and caches results to disk **PLEASE take a copy of your image folder and process locally**.

### Requirements (Install)
1. Install nodejs https://nodejs.dev/download
2. Install git and clone repo or download as zip.
3. Run "npm install" within the downloaded folder.
4. Follow the "Before you begin" links to get a JSON key: https://github.com/googleapis/nodejs-vision#before-you-begin
5. Copy the key to the "keys" folder and rename it google.key.

### Commands
#### Classify a folder full of images
```shell
node.exe classify images --path="C:/path/to/images/with spaces in path"
```
It defaults to writing to "labels.csv" within your home directory, you can change the filename with the "--output-file" argument.

Images will be automatically cached locally and resized for sending to the cloud service, google expects reasonably small images ~640x480 for label detection see: https://cloud.google.com/vision/docs/supported-files

You can re-process by using the "--force" flag or deleting the cached files from the .cache folder.

This tool has been tested with 200MB+ tiff images.

#### Named entity extraction on a field in a csv
Extract Persons, Organisations, Landmarks, Events etc. from a plain text field. Writes extra columns to [filename]-enriched.csv
```shell
node.exe classify text --csv="C:/path/to/export.csv" --id-column=id --classiy-column="Description" --add-newlines
```
Wrap arguments containing spaces with double quotes ".

### Switching Cloud Vendors
You can choose between Microsoft and Google for Image classification. Google is authorised with the JSON key in the keys
folder but Microsoft must use either the evironment variables or command line arguments eg.
```bash
node.exe classify images --path="C:/path/to/images/with spaces in path" --vendor=microsoft --microsoft-key="INSERT KEY" --microsoft-endpoint="INSER ENDPOINT"
```
See https://docs.microsoft.com/en-us/azure/cognitive-services/computer-vision/quickstarts-sdk/image-analysis-client-library?tabs=visual-studio&pivots=programming-language-javascript#prerequisites
to find out how to create the key and endpoints.

The same command for google is
```bash
node.exe classify images --path="C:/path/to/images/with spaces in path" --vendor=google
```