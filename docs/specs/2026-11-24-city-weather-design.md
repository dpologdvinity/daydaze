# City weather and night mood

This design covers [issue #217](https://github.com/dpologdvinity/daydaze/issues/217). Rain should give Beachside's boardwalk a different look on repeat visits. Around 4 a.m., the streets should feel quieter even when the sky is clear.

## Approaches

- **Occasional shared showers (recommended).** Derive a small schedule from the New York city date and read it through the existing city hour. Players in the same session see the same shower without a weather service. A shower can happen by day or night, and the same hour can look different on another date.
- **Fixed overnight rain.** Tie the rain directly to the hour. This is simpler to preview and test, but it makes wet streets a nightly fixture and removes the chance of ever seeing a dry 4 a.m.

## Weather and lighting

Start with clear weather and light showers, with a short ramp into and out of each shower. Use a deterministic schedule with dry days and occasional showers lasting tens of city minutes. Exact frequency and duration can be tuned during implementation. Resolve the live dev hour and `?time=HH:MM` through the same clock path as daylight. A `?weather=rain|clear` preview override makes comparisons repeatable on any date. Scheduled events, indoor rooms, and vehicle handling keep their existing rules.

Render rain outdoors in one bounded batch near the camera. Animate it in the vertex shader and update shared values without React state or allocations in the frame loop. Give the boardwalk and selected paved stretches a wet sheen on their existing materials. Long, soft color streaks near existing neon sources should read as reflections when seen from the walking camera. Keep them out of the ocean and keep daytime rain legible with a subtler surface treatment. The low tier uses fewer streaks and a simpler sheen, with no reflection pass or added lights. Reduced motion keeps the wet surfaces and omits moving rain streaks.

## Quiet streets

Keep the existing nighttime pedestrian taper and make its trough more pronounced around 4 a.m. Thin ordinary through traffic during the same hours, while leaving taxis, transit and event vehicles on their current schedules. Apply the traffic roster consistently to rendering and collision simulation and use the existing shared reference fleet to keep vehicle identities stable across clients. Change the live roster away from the player so the transition reads as a quieter street. Keep shops and destinations accessible on their normal schedules.

## Verification

- Test the pure schedule across a date boundary and exercise clear, ramping and rainy states. Test the 4 a.m. activity trough, day density and preservation of service and event vehicles.
- Compare the same saved boardwalk and neon street viewpoints in clear and rain. Check daytime rain, dry 4 a.m., wet 4 a.m. and reduced motion. Review captures for shader errors, readable rain and wet surfaces, and a visible change in street activity.
- Before and after, record draw calls, triangles, real lights and frame timing at the same viewpoints and quality settings. Report the browser and renderer, viewport, and measurement conditions. Verify that the low tier stays below 250 draw calls and 300,000 triangles with at most four real lights. Use the local browser results for the rendering comparison.
