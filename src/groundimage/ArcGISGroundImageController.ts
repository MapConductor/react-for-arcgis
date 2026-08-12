import {
  GroundImageController,
  GroundImageManager,
} from '@mapconductor/js-sdk-core';
import { ArcGISGroundImageOverlayRenderer } from './ArcGISGroundImageOverlayRenderer';
import type ImageElement from "@arcgis/core/layers/support/ImageElement";

export class ArcGISGroundImageController extends GroundImageController<ImageElement> {
  declare readonly renderer: ArcGISGroundImageOverlayRenderer;

  constructor(renderer: ArcGISGroundImageOverlayRenderer) {
    super({
      groundImageManager: new GroundImageManager<ImageElement>(),
      renderer,
    });
  }
}