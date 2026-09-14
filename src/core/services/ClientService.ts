import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { HireNestAccessContext, enforceCoreAccess, CoreResourceNotFoundError } from "../types";

export interface ClientEntity {
  id: string;
  name: string;
  industry?: string;
  tier?: string;
  primaryEmail?: string;
  billingAddress?: string;
  status: "ACTIVE" | "INACTIVE" | "PROSPECT";
  accountOwnerId?: string;
  activeRequirementsCount?: number;
  totalPlacementsCount?: number;
  createdAt: string;
  updatedAt: string;
}

const memoryClients = new Map<string, ClientEntity>();

function cleanData<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

export class ClientService {
  static async getClient(ctx: HireNestAccessContext, clientId: string): Promise<ClientEntity> {
    enforceCoreAccess(ctx, "clients.read");

    if (ctx.role.startsWith("CLIENT_")) {
      const userOrg = ctx.clientId || ctx.organizationId;
      enforceCoreAccess(ctx, "clients.read", { clientId: userOrg });
    }

    let client = memoryClients.get(clientId);
    if (!client) {
      try {
        const snap = await getDoc(doc(db, "organizations", clientId));
        if (snap.exists() && snap.data()?.orgType === "CLIENT") {
          const data = snap.data();
          client = {
            id: snap.id,
            name: data.companyName || data.name || "Enterprise Client",
            status: data.status || "ACTIVE",
            industry: data.industry || "Technology",
            tier: data.tier || "TIER_1_ENTERPRISE",
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          } as ClientEntity;
        }
      } catch (e) {}
    }

    if (!client) {
      // Return a standard synthesized fallback if not found
      client = {
        id: clientId,
        name: "Enterprise Client",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryClients.set(clientId, client);
    }

    return client;
  }

  static async listClients(ctx: HireNestAccessContext): Promise<ClientEntity[]> {
    enforceCoreAccess(ctx, "clients.read");

    if (ctx.role.startsWith("CLIENT_")) {
      const userOrg = ctx.clientId || ctx.organizationId;
      const client = await ClientService.getClient(ctx, userOrg);
      return [client];
    }

    try {
      const q = query(collection(db, "organizations"), where("orgType", "==", "CLIENT"), limit(100));
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.companyName || data.name || "Enterprise Client",
          industry: data.industry || "Technology",
          tier: data.tier || "TIER_1_ENTERPRISE",
          status: data.status || "ACTIVE",
          activeRequirementsCount: data.activeRequirementsCount || 0,
          totalPlacementsCount: data.totalPlacementsCount || 0,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        } as ClientEntity;
      });
      if (docs.length > 0) return docs;
    } catch (e) {}

    return Array.from(memoryClients.values()).filter(c => c.id.startsWith("cli-") || c.id.startsWith("CLIENT-"));
  }

  static async createOrUpdateClient(ctx: HireNestAccessContext, payload: Partial<ClientEntity>): Promise<ClientEntity> {
    enforceCoreAccess(ctx, "clients.create");
    const id = payload.id || `CLIENT-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const entity: ClientEntity = {
      id,
      name: payload.name || "Enterprise Client",
      industry: payload.industry || "Technology",
      tier: payload.tier || "TIER_1_ENTERPRISE",
      primaryEmail: payload.primaryEmail,
      billingAddress: payload.billingAddress,
      status: payload.status || "ACTIVE",
      accountOwnerId: payload.accountOwnerId || ctx.uid,
      activeRequirementsCount: payload.activeRequirementsCount || 0,
      totalPlacementsCount: payload.totalPlacementsCount || 0,
      createdAt: payload.createdAt || now,
      updatedAt: now,
    };

    memoryClients.set(id, entity);

    try {
      await setDoc(doc(db, "organizations", id), {
        id,
        name: entity.name,
        companyName: entity.name,
        orgType: "CLIENT",
        industry: entity.industry,
        tier: entity.tier,
        status: entity.status,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      }, { merge: true });
    } catch (e) {}

    return entity;
  }

  static createClient = ClientService.createOrUpdateClient;
}
