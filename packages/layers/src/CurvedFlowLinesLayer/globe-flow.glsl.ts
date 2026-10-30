import globeArc from '../globe-arc.glsl';

// Surface-following great-circle routes, optionally bowed to the right of
// travel like the flat curved arrows. Width and endpoint offsets use the same
// local, common-space pixel scale as the location circles.
export default `
${globeArc}

void getGlobeFlowPosition(
  float headStart, float bow, out vec3 point, out vec3 offset, out float t
) {
  GlobeArc arc = globeArc_create(
    project_position(instanceSourcePositions, instanceSourcePositions64Low),
    project_position(instanceTargetPositions, instanceTargetPositions64Low)
  );

  float arcLength = globeArc_length(arc);
  float startTrim = clamp(project_pixel_size(instanceEndpointOffsets.x) / arcLength, 0.0, 0.35);
  float endTrim = 1.0 - clamp(project_pixel_size(instanceEndpointOffsets.y) / arcLength, 0.0, 0.35);
  float baseHead = project_pixel_size(instanceThickness * 3.0 * flowLines.thicknessUnit) / arcLength;
  float head = min(baseHead, (endTrim - startTrim) * 0.45);
  float headScale = baseHead > 1e-6 ? head / baseHead : 1.0;
  float deformation = smoothstep(0.0, 1.0, headScale);
  float headWeight = smoothstep(headStart, 1.0, positions.x);
  t = positions.x < 1.0
    ? mix(startTrim, endTrim - head, positions.x / headStart)
    : endTrim;

  point = globeArc_point(arc, t, bow);
  // Like the flat arrows, the head is oriented along the route at its tip.
  vec3 normal;
  vec3 direction;
  globeArc_frame(arc, mix(t, endTrim, headWeight), bow, normal, direction);
  vec3 perpendicular = cross(normal, direction);

  float shapeY = mix(min(positions.y, 1.0), positions.y, deformation);
  float scale = mix(1.0, headScale, headWeight);
  vec2 distances = clamp(project_pixel_size(
    instanceThickness * vec2(shapeY, positions.z * deformation) * scale * flowLines.thicknessUnit
  ), vec2(-arcLength * 0.8), vec2(arcLength * 0.8));
  // Opposite directions occupy opposite sides of the great circle.
  offset = direction * distances.y - perpendicular * (distances.x + project_pixel_size(flowLines.gap));
  if (arc.angle < 1e-6) offset = vec3(0.0);
}
`;
