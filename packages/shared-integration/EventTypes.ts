export type EventType = 
  | 'OPPORTUNITY_CREATED'
  | 'OPPORTUNITY_WON'
  | 'LEAD_CREATED'
  | 'LEAD_CONVERTED'
  | 'CLIENT_CREATED'
  | 'REQUIREMENT_CREATED'
  | 'PLACEMENT_CLOSED'
  | 'INVOICE_GENERATED'
  | 'PAYMENT_RECEIVED';

export interface EventPayload {
  [key: string]: any;
}
