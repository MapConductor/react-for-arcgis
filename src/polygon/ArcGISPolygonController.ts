import {
  PolygonController,
  PolygonManager,
} from '@mapconductor/js-sdk-core';
import { ArcGISPolygonOverlayRenderer } from './ArcGISPolygonOverlayRenderer';
import type Graphic from "@arcgis/core/Graphic";

export class ArcGISPolygonOverlayController extends PolygonController<Graphic> {
  declare readonly renderer: ArcGISPolygonOverlayRenderer;

  constructor(renderer: ArcGISPolygonOverlayRenderer) {
    super({
      polygonManager: new PolygonManager<Graphic>(),
      renderer,
    });
  }
}
