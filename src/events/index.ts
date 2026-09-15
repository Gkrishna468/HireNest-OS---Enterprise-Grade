import { EventDispatcher } from './EventDispatcher.js';
import { EventHandlerRegistry } from './EventHandlerRegistry.js';
import { SubmissionEventHandler } from './handlers/SubmissionEventHandler.js';
import { InterviewEventHandler } from './handlers/InterviewEventHandler.js';
import { OfferEventHandler } from './handlers/OfferEventHandler.js';
import { VendorEventHandler } from './handlers/VendorEventHandler.js';
import { AnalyticsEventHandler } from './handlers/AnalyticsEventHandler.js';
import { IntelligenceEventHandler } from './handlers/IntelligenceEventHandler.js';
import { ServerEventForwarder } from './handlers/ServerEventForwarder.js';
import { SystemEventListener } from '../integrations/events/SystemEventListener.js';

export function initializeEventBus() {
  const eventBus = EventDispatcher.getInstance();
  const registry = EventHandlerRegistry.getInstance();

  registry.registerHandler(eventBus, new SubmissionEventHandler());
  registry.registerHandler(eventBus, new InterviewEventHandler());
  registry.registerHandler(eventBus, new OfferEventHandler());
  registry.registerHandler(eventBus, new VendorEventHandler());
  registry.registerHandler(eventBus, new AnalyticsEventHandler());
  registry.registerHandler(eventBus, new IntelligenceEventHandler());
  registry.registerHandler(eventBus, new ServerEventForwarder());

  SystemEventListener.initialize();

  console.log('[EventBus] All core event handlers initialized.');
}
