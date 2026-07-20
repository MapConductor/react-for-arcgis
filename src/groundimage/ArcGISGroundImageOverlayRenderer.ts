import {
  GroundImageEntity,
  type GroundImageAddParams,
  type GroundImageChangeParams,
  type GroundImageOverlayRenderer,
} from '@mapconductor/js-sdk-core';
import { ArcGISViewHolder } from '../ArcGISViewHolder';
import ImageElement from '@arcgis/core/layers/support/ImageElement';
import ExtentAndRotationGeoreference from '@arcgis/core/layers/support/ExtentAndRotationGeoreference';
import { geoRectToExtent } from '../helpers';

// `picture-fill` symbols on a GraphicsLayer polygon tile a fixed-size
// pattern in screen points — there is no way to make it stretch a single
// image across an arbitrary geographic rectangle. `MediaLayer` +
// `ImageElement` is ArcGIS's dedicated ground-overlay primitive: it
// georeferences a bitmap to an extent (like Google's GroundOverlay) and
// exposes a per-element `opacity`.
export class ArcGISGroundImageOverlayRenderer implements GroundImageOverlayRenderer<__esri.ImageElement> {
  constructor(
    readonly holder: ArcGISViewHolder,
    private elements: __esri.Collection<__esri.MediaElement>,
  ) {}

  createGroundImage(entity: GroundImageEntity<__esri.ImageElement>): __esri.ImageElement | null {
    const state = entity.state;
    const bounds = state.bounds;
    const imageUrl = state.imageUrl;

    const extent = geoRectToExtent(bounds);
    if (!extent || !imageUrl) return null;

    const element = new ImageElement({
      image: imageUrl,
      opacity: state.opacity,
      georeference: new ExtentAndRotationGeoreference({ extent }),
    });

    this.elements.add(element);
    return element;
  }

  updateGroundImage(element: __esri.ImageElement, entity: GroundImageEntity<__esri.ImageElement>): void {
    const state = entity.state;
    const bounds = state.bounds;
    const imageUrl = state.imageUrl;

    const extent = geoRectToExtent(bounds);
    if (!extent || !imageUrl) return;

    element.image = imageUrl;
    element.opacity = state.opacity;
    element.georeference = new ExtentAndRotationGeoreference({ extent });
  }

  removeGroundImage(element: __esri.ImageElement): void {
    this.elements.remove(element);
  }

  async onAdd(data: GroundImageAddParams[]): Promise<(__esri.ImageElement | null)[]> {
    return data.map(({ state }) => this.createGroundImage({ state } as GroundImageEntity<__esri.ImageElement>));
  }

  async onChange(data: GroundImageChangeParams<__esri.ImageElement>[]): Promise<(__esri.ImageElement | null)[]> {
    return data.map(({ current }) => {
      if (!current.groundImage) return this.createGroundImage(current);
      this.updateGroundImage(current.groundImage, current);
      return current.groundImage;
    });
  }

  async onRemove(data: GroundImageEntity<__esri.ImageElement>[]): Promise<void> {
    data.forEach(({ groundImage }) => this.removeGroundImage(groundImage));
  }

  async onPostProcess(): Promise<void> {}
}
