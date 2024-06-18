import { CosmosClient } from '@azure/cosmos';
import * as dotenv from 'dotenv';

dotenv.config();

const endpoint = process.env.COSMOS_ENDPOINT as string;
const key = process.env.COSMOS_KEY as string;

if (!endpoint || !key) {
  console.error("Cosmos DB endpoint or key not provided.");
  process.exit(1); // Exit the process if environment variables are missing
}

const client = new CosmosClient({ endpoint, key });

export async function getOrCreateDatabase(databaseId: string) {
  const { database } = await client.databases.createIfNotExists({ id: databaseId });
  return database;
}

export async function getOrCreateContainer(database: any, containerId: string) {
  const { container } = await database.containers.createIfNotExists({ id: containerId });
  return container;
}
