import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import type LOD from '@arcgis/core/layers/support/LOD';
import TileInfo from '@arcgis/core/layers/support/TileInfo';
import type MapView from '@arcgis/core/views/MapView';
import type SceneView from '@arcgis/core/views/SceneView';

/**
 * What a view loses with its basemap, and has to be told instead.
 *
 * A view takes its spatial reference from the basemap, and a 2D `MapView` its
 * zoom ladder (`constraints.lods`) too. Take the basemap away and both kinds
 * fall back to WGS84 -- the MapView also with no ladder, so `zoom` reads -1 --
 * and every Web Mercator tile layer is dropped or suspended, because neither
 * view reprojects tiles. Measured on 4.32, both went blank with no error.
 */
const webMercator = new SpatialReference({ wkid: 102100 });

export function webMercatorViewProperties(): { spatialReference: SpatialReference; lods: LOD[] } {
  return { spatialReference: webMercator, lods: TileInfo.create({ spatialReference: webMercator }).lods };
}

/** Removes the basemap from a live view without the 2D view losing its tiling scheme. */
export function removeBasemapKeepingWebMercator(view: MapView | SceneView): void {
  view.map!.basemap = null;
  const { spatialReference, lods } = webMercatorViewProperties();
  view.spatialReference = spatialReference;
  if (view.type === '2d') view.constraints.lods = lods;
}
