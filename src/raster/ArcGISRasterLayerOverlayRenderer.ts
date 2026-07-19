import {
  RasterLayerEntity,
  type MapCameraPosition,
  type RasterLayerAddParams,
  type RasterLayerChangeParams,
  type RasterLayerOverlayRenderer,
} from '@mapconductor/js-sdk-core';
import { ArcGISViewHolder } from '../ArcGISViewHolder';
import WebTileLayer from '@arcgis/core/layers/WebTileLayer';

export class ArcGISRasterLayerOverlayRenderer implements RasterLayerOverlayRenderer<__esri.Layer> {
  constructor(readonly holder: ArcGISViewHolder) {}

  async createRasterLayer(entity: RasterLayerEntity<__esri.Layer>): Promise<__esri.Layer | null> {
    const state = entity.state;
    const source = state.source;
    const urlTemplate = source.type === 'UrlTemplate'
      ? source.template
      : source.type === 'ArcGisService'
        ? `${source.serviceUrl.replace(/\/+$/, '')}/tile/{z}/{y}/{x}`
        : source.url;

    try {
      const rasterLayer = new WebTileLayer({
        urlTemplate,
      });

      this.holder.map.map?.add(rasterLayer);
      return rasterLayer;
    } catch (e) {
      console.error('Failed to create raster layer:', e);
      return null;
    }
  }

  async updateRasterLayer(layer: __esri.Layer, entity: RasterLayerEntity<__esri.Layer>): Promise<void> {
    const state = entity.state;
    const source = state.source;

    const urlTemplate = source.type === 'UrlTemplate'
      ? source.template
      : source.type === 'ArcGisService'
        ? `${source.serviceUrl.replace(/\/+$/, '')}/tile/{z}/{y}/{x}`
        : source.url;
    (layer as __esri.WebTileLayer).urlTemplate = urlTemplate;
  }

  async removeRasterLayer(layer: __esri.Layer): Promise<void> {
    this.holder.map.map?.remove(layer);
  }

  async onAdd(data: RasterLayerAddParams[]): Promise<(__esri.Layer | null)[]> {
    return Promise.all(data.map(({ state }) => state.visible ? this.createRasterLayer({ state } as RasterLayerEntity<__esri.Layer>) : null));
  }

  async onChange(data: RasterLayerChangeParams<__esri.Layer>[]): Promise<(__esri.Layer | null)[]> {
    return Promise.all(data.map(async ({ current, prev }) => {
      await this.removeRasterLayer(prev.layer);
      return current.state.visible ? this.createRasterLayer(current) : null;
    }));
  }

  async onRemove(data: RasterLayerEntity<__esri.Layer>[]): Promise<void> {
    await Promise.all(data.map(({ layer }) => this.removeRasterLayer(layer)));
  }

  async onCameraChanged(_mapCameraPosition: MapCameraPosition): Promise<void> {}
  async onPostProcess(): Promise<void> {}
}
