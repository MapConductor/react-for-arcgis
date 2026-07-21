import {
  PolygonController,
  PolygonManager,
} from '@mapconductor/js-sdk-core';
import { ArcGISPolygonOverlayRenderer } from './ArcGISPolygonOverlayRenderer';

export class ArcGISPolygonOverlayController extends PolygonController<__esri.Graphic> {
  declare readonly renderer: ArcGISPolygonOverlayRenderer;

  constructor(renderer: ArcGISPolygonOverlayRenderer) {
    super({
      polygonManager: new PolygonManager<__esri.Graphic>(),
      renderer,
    });
  }
}
