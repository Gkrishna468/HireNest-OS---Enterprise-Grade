import { adminDb } from "../lib/firebase-admin";

/**
 * Infrastructure Partitioning & Tenant Sharding
 * Maps tenants to execution planes, distinct geographical regions,
 * or logically isolated queue shards for high throughput.
 */

export type RegionId = "us-east" | "eu-west" | "apac-south" | "global-default";

export async function resolveTenantShard(orgId: string): Promise<{ shardId: string, region: RegionId, tier: string }> {
   if (!adminDb) return { shardId: "shard-0", region: "global-default", tier: "standard" };
   
   try {
      const tenantRef = adminDb.collection("tenantInfrastructureMap").doc(orgId);
      const doc = await tenantRef.get();
      
      if (doc.exists) {
         return doc.data() as { shardId: string, region: RegionId, tier: string };
      }
      
      // Automatic initial assignment based on hash or logic
      const assignedRegion: RegionId = orgId.startsWith("ORG-EU") ? "eu-west" : "global-default";
      const assignedShard = `shard-${Math.floor(Math.random() * 16)}`; // 16 partitions
      
      const config = {
         shardId: assignedShard,
         region: assignedRegion,
         tier: "standard",
         assignedAt: new Date().toISOString()
      };
      
      await tenantRef.set(config);
      return config;
   } catch(err) {
      console.warn("[INFRA_SHARDING] Failed to resolve shard map. Defaulting.", err);
      return { shardId: "shard-0", region: "global-default", tier: "standard" };
   }
}

export function generatePartitionedQueueName(baseQueue: string, shardId: string, region: RegionId): string {
   return `${region}.${shardId}.${baseQueue}`;
}
