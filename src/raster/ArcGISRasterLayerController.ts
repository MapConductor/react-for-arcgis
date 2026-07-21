import {
  RasterLayerController,
  RasterLayerManager,
} from '@mapconductor/js-sdk-core';
import { ArcGISRasterLayerOverlayRenderer } from './ArcGISRasterLayerOverlayRenderer';

export class ArcGISRasterLayerController extends RasterLayerController<__esri.Layer> {
  declare readonly renderer: ArcGISRasterLayerOverlayRenderer;

  constructor(renderer: ArcGISRasterLayerOverlayRenderer) {
    super({
      rasterLayerManager: new RasterLayerManager<__esri.Layer>(),
      renderer,
    });
  }
}
