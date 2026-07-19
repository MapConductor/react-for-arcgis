import {
  RasterLayerController,
  RasterLayerManager,
  type RasterLayerState,
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

  async composition(data: RasterLayerState[]): Promise<void> {
    await this.add(data);
  }

  has(state: RasterLayerState): boolean {
    return this.rasterLayerManager.hasEntity(state.id);
  }
}
