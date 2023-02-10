import { AzureFunction, Context } from '@azure/functions';

import { BlobServiceAccountManager, DatabaseManager, Datasets } from '@undp-data/geohub-cli';

const { AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_ACCESS_KEY, DATABASE_CONNECTION, TITILER_ENDPOINT } =
	process.env;

const eventGridTrigger: AzureFunction = async function (
	context: Context,
	eventGridEvent: any
): Promise<void> {
	context.log('JavaScript Event Grid function processed a request.');
	context.log('Subject: ' + eventGridEvent.subject);
	context.log('Time: ' + eventGridEvent.eventTime);
	context.log('Data: ' + JSON.stringify(eventGridEvent.data));

	const validationEventType = 'Microsoft.EventGrid.SubscriptionValidationEvent';
	const storageBlobCreatedEvent = 'Microsoft.Storage.BlobCreated';

	if (
		!AZURE_STORAGE_ACCOUNT ||
		!AZURE_STORAGE_ACCESS_KEY ||
		!DATABASE_CONNECTION ||
		!TITILER_ENDPOINT
	) {
		context.log('Please set environment variables for this function');
	} else {
		const blobManager = new BlobServiceAccountManager(
			AZURE_STORAGE_ACCOUNT,
			AZURE_STORAGE_ACCESS_KEY,
			TITILER_ENDPOINT
		);

		for (const events in eventGridEvent.data) {
			const body = eventGridEvent.data[events];
			// Deserialize the event data into the appropriate type based on event type
			if (body.data && body.eventType == validationEventType) {
				context.log(
					'Got SubscriptionValidation event data, validation code: ' +
						body.data.validationCode +
						' topic: ' +
						body.topic
				);

				const code = body.data.validationCode;
				context.res = { status: 200, body: { ValidationResponse: code } };
			} else if (body.data && body.eventType == storageBlobCreatedEvent) {
				const blobCreatedEventData = body.data;
				context.log(
					'Relaying received blob created event payload:' + JSON.stringify(blobCreatedEventData)
				);

				const url = blobCreatedEventData.url;

				// scan file to register
				const res = await blobManager.scanBlob(url);
				if (!res.dataset) {
					context.log('No dataset to register');
					continue;
				}
				const datasets = new Datasets([res.dataset]);
				const dbManager = new DatabaseManager(DATABASE_CONNECTION);
				await dbManager.register(datasets);

				context.log(`${url} was registered to GeoHub`);
			}
		}
	}
	context.done();
};

export default eventGridTrigger;
