import {
  GroundImageController,
  GroundImageManager,
} from '@mapconductor/js-sdk-core';
import { ArcGISGroundImageOverlayRenderer } from './ArcGISGroundImageOverlayRenderer';

export class ArcGISGroundImageController extends GroundImageController<__esri.ImageElement> {
  declare readonly renderer: ArcGISGroundImageOverlayRenderer;

  constructor(renderer: ArcGISGroundImageOverlayRenderer) {
    super({
      groundImageManager: new GroundImageManager<__esri.ImageElement>(),
      renderer,
    });
  }
}