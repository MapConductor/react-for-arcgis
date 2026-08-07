import {
  RasterLayerController,
  RasterLayerManager,
  type RasterHeaderSupport,
} from '@mapconductor/js-sdk-core';
import { ArcGISRasterLayerOverlayRenderer } from './ArcGISRasterLayerOverlayRenderer';

export class ArcGISRasterLayerController extends RasterLayerController<__esri.Layer> {
  /**
   * WebTileLayer のタイル取得に介入する口が無い（esriConfig.request.interceptors は
   * 未検証のため、確かめずに対応とは書かない）。
   *
   * userAgent はブラウザが上書きを許さないので、どのプロバイダでも web では効かない。
   */
  protected override get headerSupport(): RasterHeaderSupport {
    return { provider: 'ArcGIS', extraHeaders: false };
  }

  declare readonly renderer: ArcGISRasterLayerOverlayRenderer;

  constructor(renderer: ArcGISRasterLayerOverlayRenderer) {
    super({
      rasterLayerManager: new RasterLayerManager<__esri.Layer>(),
      renderer,
    });
  }
}
