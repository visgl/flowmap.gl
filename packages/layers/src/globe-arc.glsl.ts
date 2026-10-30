/*
 * Copyright (c) Flowmap.gl contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared great-circle helpers for flow line layers in globe projection.
// Positions are deck.gl globe common-space coordinates.
export default `
struct GlobeArc {
  vec3 start;
  // Unit vector in the route plane, perpendicular to start, toward the target.
  vec3 tangent;
  // Unit pole of the route plane: the left side of travel.
  vec3 left;
  float angle;
  float sourceRadius;
  float targetRadius;
};

GlobeArc globeArc_create(vec3 source, vec3 target) {
  GlobeArc arc;
  arc.sourceRadius = length(source);
  arc.targetRadius = length(target);
  arc.start = normalize(source);
  vec3 end = normalize(target);
  arc.angle = atan(length(cross(arc.start, end)), clamp(dot(arc.start, end), -1.0, 1.0));
  vec3 tangent = end - arc.start * dot(arc.start, end);
  if (length(tangent) < 1e-6) {
    // Antipodal endpoints have no unique shortest route. Choose a stable plane;
    // the same fallback also prevents NaNs for coincident locations.
    vec3 axis = abs(arc.start.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    arc.tangent = normalize(cross(axis, arc.start));
  } else {
    arc.tangent = normalize(tangent);
  }
  arc.left = cross(arc.start, arc.tangent);
  return arc;
}

float globeArc_length(GlobeArc arc) {
  return max(arc.sourceRadius * arc.angle, 1e-6);
}

// Lateral displacement (in common units) to the right of travel, following the
// same 2t(1 - t) profile as a quadratic Bezier with the control point offset by bow.
float globeArc_bow(float t, float bow) {
  return 2.0 * t * (1.0 - t) * bow;
}

// Point at t along the route, bowed to the right of travel and kept on the sphere.
vec3 globeArc_point(GlobeArc arc, float t, float bow) {
  float theta = arc.angle * t;
  float radius = mix(arc.sourceRadius, arc.targetRadius, t);
  vec3 normal = cos(theta) * arc.start + sin(theta) * arc.tangent;
  return normalize(normal - arc.left * (globeArc_bow(t, bow) / radius)) * radius;
}

// Unit surface normal and travel direction at t, computed analytically so that
// short routes keep their precision.
void globeArc_frame(GlobeArc arc, float t, float bow, out vec3 normal, out vec3 direction) {
  float theta = arc.angle * t;
  float radius = mix(arc.sourceRadius, arc.targetRadius, t);
  vec3 greatCircleNormal = cos(theta) * arc.start + sin(theta) * arc.tangent;
  vec3 greatCircleDirection = -sin(theta) * arc.start + cos(theta) * arc.tangent;
  float lateral = globeArc_bow(t, bow) / radius;
  float lateralRate = 2.0 * (1.0 - 2.0 * t) * bow / radius;
  normal = normalize(greatCircleNormal - arc.left * lateral);
  vec3 velocity = arc.angle * greatCircleDirection - arc.left * lateralRate;
  velocity -= normal * dot(velocity, normal);
  direction = length(velocity) > 1e-12 ? normalize(velocity) : greatCircleDirection;
}
`;
