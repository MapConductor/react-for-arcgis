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
import type { MediaElement } from "@arcgis/core/layers/media/types";
import type Collection from "@arcgis/core/core/Collection";

// `picture-fill` symbols on a GraphicsLayer polygon tile a fixed-size
// pattern in screen points — there is no way to make it stretch a single
// image across an arbitrary geographic rectangle. `MediaLayer` +
// `ImageElement` is ArcGIS's dedicated ground-overlay primitive: it
// georeferences a bitmap to an extent (like Google's GroundOverlay) and
// exposes a per-element `opacity`.
export class ArcGISGroundImageOverlayRenderer implements GroundImageOverlayRenderer<ImageElement> {
  constructor(
    readonly holder: ArcGISViewHolder,
    private elements: Collection<MediaElement>,
  ) {}

  createGroundImage(entity: GroundImageEntity<ImageElement>): ImageElement | null {
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

  updateGroundImage(element: ImageElement, entity: GroundImageEntity<ImageElement>): void {
    const state = entity.state;
    const bounds = state.bounds;
    const imageUrl = state.imageUrl;

    const extent = geoRectToExtent(bounds);
    if (!extent || !imageUrl) return;

    element.image = imageUrl;
    element.opacity = state.opacity;
    element.georeference = new ExtentAndRotationGeoreference({ extent });
  }

  removeGroundImage(element: ImageElement): void {
    this.elements.remove(element);
  }

  async onAdd(data: GroundImageAddParams[]): Promise<(ImageElement | null)[]> {
    return data.map(({ state }) => this.createGroundImage({ state } as GroundImageEntity<ImageElement>));
  }

  async onChange(data: GroundImageChangeParams<ImageElement>[]): Promise<(ImageElement | null)[]> {
    return data.map(({ current }) => {
      if (!current.groundImage) return this.createGroundImage(current);
      this.updateGroundImage(current.groundImage, current);
      return current.groundImage;
    });
  }

  async onRemove(data: GroundImageEntity<ImageElement>[]): Promise<void> {
    data.forEach(({ groundImage }) => this.removeGroundImage(groundImage));
  }

  async onPostProcess(): Promise<void> {}
}
