// @ts-expect-error - no types
import { Event, EventTarget } from "event-target-shim";

// polyfill Event & EventTarget for electron-store@11 > conf
if (!global.Event) {
  (global as any).Event = Event;
}

if (!global.EventTarget) {
  (global as any).EventTarget = EventTarget;
}
