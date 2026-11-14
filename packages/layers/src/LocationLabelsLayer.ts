import {
  TextLayer,
  type TextLayerProps,
  // Experimental deck.gl export, also used by its PointLabelLayer.
  _TextBackgroundLayer as TextBackgroundLayer,
} from '@deck.gl/layers';
import {
  CollisionFilterExtension,
  type CollisionFilterExtensionProps,
} from '@deck.gl/extensions';
import {
  type FlowCirclesLayerAttributes,
  getLocationCoordsByIndex,
  getOuterCircleRadiusByIndex,
} from '@flowmap.gl/data';
import type {DefaultProps} from '@deck.gl/core';

/** TextLayer overrides; accessors receive the generated location/cluster name. */
export type LocationLabelProps = Partial<
  Omit<
    TextLayerProps<string> & CollisionFilterExtensionProps<string>,
    'id' | 'data'
  >
>;

type LabelExtensions = CollisionFilterExtensionProps<string> & {
  renderBackground: boolean;
};

const collisionFilter = new CollisionFilterExtension();

/** Keep the collision anchor inside the bounds even when labels are offset. */
class CollisionBackgroundLayer extends TextBackgroundLayer<string> {
  static layerName = 'LocationLabelCollisionBackgroundLayer';

  getShaders() {
    const shaders = super.getShaders();
    // As in deck.gl's PointLabelLayer, padding must account for each label's
    // pixel offset in the shader. Preserve padding on the other side as well.
    const vs = shaders.vs
      .replaceAll('textBackground.padding', 'collisionPadding')
      .replace(
        'void main(void) {',
        `void main(void) {
          vec2 localOffset = rotate_by_angle(instancePixelOffsets, -instanceAngles);
          vec4 collisionPadding = textBackground.padding +
            max(vec4(localOffset, -localOffset), vec4(0.0));`,
      );
    return {...shaders, vs};
  }
}

/** Collision bounds are separate from the optional visible background. */
export default class LocationLabelsLayer extends TextLayer<
  string,
  LabelExtensions
> {
  static layerName = 'LocationLabelsLayer';
  static defaultProps: DefaultProps<
    TextLayerProps & {renderBackground: boolean}
  > = {
    renderBackground: false,
  };

  filterSubLayer({
    layer,
    renderPass,
  }: Parameters<TextLayer['filterSubLayer']>[0]) {
    const collisionBackground = layer.id.endsWith('-collision-background');
    return renderPass === 'collision'
      ? collisionBackground
      : !collisionBackground;
  }

  renderLayers(): ReturnType<TextLayer['renderLayers']> {
    const layers = super.renderLayers();
    const background = layers[0] as TextBackgroundLayer<string> | false;
    const characters = layers[1];
    return [
      this.props.renderBackground && background,
      background &&
        new CollisionBackgroundLayer(background.props, {
          id: `${this.id}-collision-background`,
          // Keep the collision anchor comfortably inside a solid rectangle.
          padding: [3, 3, 3, 3],
          borderRadius: 0,
        }),
      characters,
    ];
  }
}

export function getLocationLabelProps(
  data: string[],
  circles: FlowCirclesLayerAttributes,
  overrides: LocationLabelProps = {},
): Partial<TextLayerProps<string> & LabelExtensions> {
  const maxRadius = data.reduce(
    (max, _, index) =>
      Math.max(max, getOuterCircleRadiusByIndex(circles, index)),
    0,
  );
  const triggers = overrides.updateTriggers ?? {};
  return {
    maxWidth: 1000,
    pickable: false,
    fontFamily: 'Helvetica',
    getPixelOffset: (_, {index}) => [
      0,
      getOuterCircleRadiusByIndex(circles, index) + 5,
    ],
    getPosition: (_, {index}) => getLocationCoordsByIndex(circles, index),
    getText: (text) => text,
    getSize: 10,
    getColor: [255, 255, 255, 255],
    getAngle: 0,
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'top',
    collisionEnabled: true,
    getCollisionPriority: (_, {index}) =>
      (1000 * getOuterCircleRadiusByIndex(circles, index)) / (maxRadius || 1),
    ...overrides,
    // Always construct collision bounds, regardless of the visual background.
    background: true,
    renderBackground: overrides.background ?? false,
    extensions: [...(overrides.extensions ?? []), collisionFilter],
    // Outlines need SDF fonts; preserve an explicitly chosen font setting.
    fontSettings: {
      sdf: Boolean(overrides.outlineWidth),
      ...overrides.fontSettings,
    },
    collisionTestProps: {
      sizeScale: (overrides.sizeScale ?? 1) * 2,
      ...overrides.collisionTestProps,
    },
    updateTriggers: {
      ...triggers,
      getText: [overrides.getText, triggers.getText],
      getPosition: [circles, overrides.getPosition, triggers.getPosition],
      getPixelOffset: [
        circles,
        overrides.getPixelOffset,
        triggers.getPixelOffset,
      ],
      getCollisionPriority: [
        circles,
        overrides.getCollisionPriority,
        triggers.getCollisionPriority,
      ],
    },
  };
}
