import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { env } from './env.js';

let _client = null;

function getClient() {
  if (!_client) {
    _client = new SecretsManagerClient({
      region: env.AWS_DEFAULT_REGION,
      endpoint: env.AWS_ENDPOINT_URL || undefined,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

export async function getSecret(secretName) {
  const client = getClient();
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
  return JSON.parse(response.SecretString);
}
