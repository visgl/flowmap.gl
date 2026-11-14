import {TextLayer} from '@deck.gl/layers';
import type {CollisionFilterExtensionProps} from '@deck.gl/extensions';

/** Use solid label bounds for collision tests, without drawing a background. */
export default class LocationLabelsLayer extends TextLayer<
  string,
  CollisionFilterExtensionProps<string>
> {
  static layerName = 'LocationLabelsLayer';

  filterSubLayer({
    layer,
    renderPass,
  }: Parameters<TextLayer['filterSubLayer']>[0]) {
    const background = layer.id.endsWith('-background');
    return renderPass === 'collision' ? background : !background;
  }
}
