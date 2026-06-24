import { IEventBus } from '../IEventBus';
import { IEventHandler } from '../EventHandlerRegistry';
import { EventEnvelope } from '../types/EventEnvelope';
import { EventTypes } from '../../lib/events/EventTypes';
import { VendorIntelligenceService } from '../../services/VendorIntelligenceService';

export class VendorEventHandler implements IEventHandler {
  handlerId = 'VendorEventHandler';

  register(eventBus: IEventBus): void {
    eventBus.subscribe(EventTypes.JOB_PUBLISHED, this.handlerId, this.handleJobPublished.bind(this));
    eventBus.subscribe(EventTypes.SUBMISSION_CREATED, this.handlerId, this.handleSubmissionCreated.bind(this));
    eventBus.subscribe(EventTypes.INTERVIEW_SCHEDULED, this.handlerId, this.handleInterviewScheduled.bind(this));
    eventBus.subscribe('PLACEMENT_CLOSED' as any, this.handlerId, this.handlePlacementClosed.bind(this));
  }

  private async handleJobPublished(event: EventEnvelope<any>): Promise<void> {
    console.log(`[VendorEventHandler] Processing JOB_PUBLISHED: ${event.id}`);
    // If the payload specifies vendor distribution, we could log REQUIREMENT_RECEIVED
    const { vendorIds, requirementId } = event.payload;
    if (vendorIds && Array.isArray(vendorIds)) {
      for (const vendorId of vendorIds) {
         await VendorIntelligenceService.trackVendorEvent(vendorId, "Vendor", event.tenantId, "REQUIREMENT_RECEIVED");
      }
    }
  }

  private async handleSubmissionCreated(event: EventEnvelope<any>): Promise<void> {
    const { vendorId, vendorName } = event.payload;
    if (vendorId) {
      await VendorIntelligenceService.trackVendorEvent(vendorId, vendorName || vendorId, event.tenantId, "SUBMISSION_CREATED");
      await VendorIntelligenceService.trackVendorEvent(vendorId, vendorName || vendorId, event.tenantId, "REQUIREMENT_WORKED");
    }
  }

  private async handleInterviewScheduled(event: EventEnvelope<any>): Promise<void> {
    const { vendorId, vendorName } = event.payload;
    if (vendorId) {
      await VendorIntelligenceService.trackVendorEvent(vendorId, vendorName || vendorId, event.tenantId, "INTERVIEW_SCHEDULED");
    }
  }

  private async handlePlacementClosed(event: EventEnvelope<any>): Promise<void> {
    const { vendorId, vendorName, placementFee } = event.payload;
    if (vendorId) {
      await VendorIntelligenceService.trackVendorEvent(vendorId, vendorName || vendorId, event.tenantId, "PLACEMENT_CLOSED", placementFee || 0);
    }
  }
}
