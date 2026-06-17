export interface IntegrationMapping {
  sourceSystem: "CRM" | "CORE_OS" | "FINANCE_OS";
  targetSystem: "CRM" | "CORE_OS" | "FINANCE_OS";

  sourceEntityType: string;
  sourceEntityId: string;

  targetEntityType: string;
  targetEntityId: string;
  
  syncedAt?: string;
}
