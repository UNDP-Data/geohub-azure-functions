import { AzureFunction, Context, HttpRequest } from '@azure/functions';

import { BlobServiceAccountManager, DatabaseManager, Datasets } from '@undp-data/geohub-cli';

const { AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_ACCESS_KEY, DATABASE_CONNECTION, TITILER_ENDPOINT } =
	process.env;

const httpTrigger: AzureFunction = async function (
	context: Context,
	req: HttpRequest
): Promise<void> {
	const url = req.query.url || (req.body && req.body.url);

	if (
		!AZURE_STORAGE_ACCOUNT ||
		!AZURE_STORAGE_ACCESS_KEY ||
		!DATABASE_CONNECTION ||
		!TITILER_ENDPOINT
	) {
		context.res = {
			status: 500,
			body: {
				url,
				message: 'Please set environment variables for this function'
			}
		};
	} else {
		if (!url) {
			context.res = {
				status: 400,
				body: {
					url,
					message: 'Please pass a url on the query string or in the request body'
				}
			};
		} else {
			const blobManager = new BlobServiceAccountManager(
				AZURE_STORAGE_ACCOUNT,
				AZURE_STORAGE_ACCESS_KEY,
				TITILER_ENDPOINT
			);

			// scan file to register
			const dbManager = new DatabaseManager(DATABASE_CONNECTION);
			const res = await blobManager.scanBlob(url);
			if (!res.dataset) {
				await dbManager.deleteDataset(url);
				context.res = {
					body: {
						url,
						message: `The blob of '${url}' does not exist and it was deleted from the database.`
					}
				};
			} else {
				const datasets = new Datasets([res.dataset]);
				await dbManager.register(datasets);

				context.res = {
					body: {
						url,
						message: `${url} was registered to GeoHub`,
						dataset: res.dataset
					}
				};
			}
		}
	}
};

export default httpTrigger;
