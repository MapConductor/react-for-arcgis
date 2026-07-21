import {
  PolylineController,
  PolylineManager,
} from '@mapconductor/js-sdk-core';
import { ArcGISPolylineOverlayRenderer } from './ArcGISPolylineOverlayRenderer';

export class ArcGISPolylineOverlayController extends PolylineController<__esri.Graphic> {
  declare readonly renderer: ArcGISPolylineOverlayRenderer;

  constructor(renderer: ArcGISPolylineOverlayRenderer) {
    super({
      polylineManager: new PolylineManager<__esri.Graphic>(),
      renderer,
    });
  }
}
