// Surface-following great-circle routes. Width and endpoint offsets use the
// same local, common-space pixel scale as the location circles.
export default `
void getGlobeFlowPosition(
  float headStart, out vec3 point, out vec3 offset, out float t
) {
  vec3 source = project_position(instanceSourcePositions, instanceSourcePositions64Low);
  vec3 target = project_position(instanceTargetPositions, instanceTargetPositions64Low);
  float radius = length(source);
  vec3 start = normalize(source);
  vec3 end = normalize(target);
  float angle = atan(length(cross(start, end)), clamp(dot(start, end), -1.0, 1.0));
  vec3 tangent = end - start * dot(start, end);
  if (length(tangent) < 1e-6) {
    // Antipodal endpoints have no unique shortest route. Choose a stable plane;
    // the same fallback also prevents NaNs for coincident locations.
    vec3 axis = abs(start.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    tangent = normalize(cross(axis, start));
  } else {
    tangent = normalize(tangent);
  }

  float arcLength = max(radius * angle, 1e-6);
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

  float theta = angle * t;
  vec3 normal = cos(theta) * start + sin(theta) * tangent;
  vec3 direction = -sin(theta) * start + cos(theta) * tangent;
  vec3 perpendicular = cross(normal, direction);
  point = normal * mix(radius, length(target), t);

  float shapeY = mix(min(positions.y, 1.0), positions.y, deformation);
  float scale = mix(1.0, headScale, headWeight);
  vec2 distances = clamp(project_pixel_size(
    instanceThickness * vec2(shapeY, positions.z * deformation) * scale * flowLines.thicknessUnit
  ), vec2(-arcLength * 0.8), vec2(arcLength * 0.8));
  // Opposite directions occupy opposite sides of the great circle.
  offset = direction * distances.y - perpendicular * (distances.x + project_pixel_size(flowLines.gap));
  if (angle < 1e-6) offset = vec3(0.0);
}
`;
