import { IntegrationMapping } from '../../../packages/shared-integration/index.js';
import { WebhookClient } from './WebhookClient.js';

export class MappingResolver {
  static async resolveOsEntityId(crmEntityType: string, crmEntityId: string, osEntityType: string): Promise<string | null> {
    const res = await WebhookClient.post('/api/integrations/sync/resolve', {
      crmEntityType,
      crmEntityId,
      osEntityType
    });
    return (res as any)?.osEntityId || null;
  }
}
