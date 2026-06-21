import { IntegrationMapping } from '../../../packages/shared-integration';
import { WebhookClient } from './WebhookClient';

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
