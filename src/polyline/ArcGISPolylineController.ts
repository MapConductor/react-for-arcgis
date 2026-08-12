import {
  PolylineController,
  PolylineManager,
} from '@mapconductor/js-sdk-core';
import { ArcGISPolylineOverlayRenderer } from './ArcGISPolylineOverlayRenderer';
import type Graphic from "@arcgis/core/Graphic";

export class ArcGISPolylineOverlayController extends PolylineController<Graphic> {
  declare readonly renderer: ArcGISPolylineOverlayRenderer;

  constructor(renderer: ArcGISPolylineOverlayRenderer) {
    super({
      polylineManager: new PolylineManager<Graphic>(),
      renderer,
    });
  }
}
