import {LayerExtension} from '@deck.gl/core';

/** Clip the hidden hemisphere in both the color and picking passes. */
export default class GlobeOcclusionExtension extends LayerExtension {
  static extensionName = 'FlowmapGlobeOcclusion';

  getShaders() {
    return {
      inject: {
        'vs:#decl': 'out float flowmapGlobeVisibility;',
        'vs:DECKGL_FILTER_GL_POSITION': `
          flowmapGlobeVisibility = 1.0;
          if (project.projectionMode == PROJECTION_MODE_GLOBE) {
            vec3 position = geometry.position.xyz;
            flowmapGlobeVisibility = dot(normalize(position), project.cameraPosition - position);
          }
        `,
        'fs:#decl': 'in float flowmapGlobeVisibility;',
        'fs:DECKGL_FILTER_COLOR': `
          if (flowmapGlobeVisibility < 0.0) discard;
        `,
      },
    };
  }
}
