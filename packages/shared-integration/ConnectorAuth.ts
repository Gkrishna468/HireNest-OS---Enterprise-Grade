export interface ConnectorAuthClaims {
  system: string;
  tenantId: string;
  permissions: string[];
}

export interface ConnectorAuthPayload {
  token: string;
}
