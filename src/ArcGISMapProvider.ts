import { MapProvider, type MapViewControllerInterface } from '@mapconductor/js-sdk-core';
import { ArcGISMapViewController, arcGISZoomToScale } from './ArcGISMapViewController';
import { ArcGISViewHolder } from './ArcGISViewHolder';
import { ArcGISMarkerController } from './marker/ArcGISMarkerController';
import { ArcGISCircleOverlayController } from './circle/ArcGISCircleController';
import { ArcGISPolylineOverlayController } from './polyline/ArcGISPolylineController';
import { ArcGISPolygonOverlayController } from './polygon/ArcGISPolygonController';
import { ArcGISGroundImageController } from './groundimage/ArcGISGroundImageController';
import { ArcGISRasterLayerController } from './raster/ArcGISRasterLayerController';
import { ArcGISCircleOverlayRenderer } from './circle/ArcGISCircleOverlayRenderer';
import { ArcGISMarkerRenderer } from './marker/ArcGISMarkerRenderer';
import { ArcGISPolylineOverlayRenderer } from './polyline/ArcGISPolylineOverlayRenderer';
import { ArcGISPolygonOverlayRenderer } from './polygon/ArcGISPolygonOverlayRenderer';
import { ArcGISGroundImageOverlayRenderer } from './groundimage/ArcGISGroundImageOverlayRenderer';
import { ArcGISRasterLayerOverlayRenderer } from './raster/ArcGISRasterLayerOverlayRenderer';
import { ArcGISConfig } from './ArcGISMapConfig';
import { ZoomAltitudeConverter } from './zoom';
import { ArcGISDesign } from './ArcGISMapDesign';
import { geoRectToExtent } from './helpers';
// Static imports, deliberately: this package's other modules (marker/circle
// renderers, controller) already import @arcgis/core/Graphic etc. statically,
// so dynamic imports here split @arcgis/core discovery into two waves. On a
// cold Vite dev start that triggers a mid-session dependency re-optimization
// without a reload, leaving TWO copies of @arcgis/core in the page — the view
// comes from one copy, overlay Graphics from the other, and ArcGIS silently
// ignores the foreign-class graphics (map renders, overlays don't). Apps
// still get code-splitting by lazy-loading this package as a whole.
import Map from '@arcgis/core/Map';
import GL from '@arcgis/core/layers/GraphicsLayer';
import ML from '@arcgis/core/layers/MediaLayer';
import LMS from '@arcgis/core/layers/support/LocalMediaElementSource';
import BM from '@arcgis/core/Basemap';
import SV from '@arcgis/core/views/SceneView';
import MV from '@arcgis/core/views/MapView';
import esriConfig from '@arcgis/core/config';
import ElevationLayer from '@arcgis/core/layers/ElevationLayer';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import { Earth, type GeoRectBounds } from '@mapconductor/js-sdk-core';

const WEB_MERCATOR_RADIUS_METERS = Earth.RADIUS_METERS;
const DPI = 96;
const INCHES_PER_METER = 39.37;

function toWebMercatorMeters(lonDeg: number, latDeg: number): { x: number; y: number } {
  const latRad = (latDeg * Math.PI) / 180;
  return {
    x: WEB_MERCATOR_RADIUS_METERS * ((lonDeg * Math.PI) / 180),
    y: WEB_MERCATOR_RADIUS_METERS * Math.log(Math.tan(Math.PI / 4 + latRad / 2)),
  };
}

// MapView's `geometry` pan constraint alone does not stop the user from
// zooming out past the point where the box would no longer fill the
// viewport (confirmed empirically: without this, zooming out fully showed a
// near-global extent) — the same gap Leaflet's maxBounds has. Compute the
// scale at which the rectangle exactly fills the current viewport, the same
// way Google Maps' strictBounds and Leaflet's getBoundsZoom behave, so
// zooming out stops right at the box edge.
function scaleToFitBounds(
  bounds: GeoRectBounds,
  viewport: { width: number; height: number },
): number | null {
  if (!bounds.southWest || !bounds.northEast || viewport.width <= 0 || viewport.height <= 0) return null;
  const sw = toWebMercatorMeters(bounds.southWest.longitude, bounds.southWest.latitude);
  const ne = toWebMercatorMeters(bounds.northEast.longitude, bounds.northEast.latitude);
  const widthMeters = ne.x - sw.x;
  const heightMeters = ne.y - sw.y;
  if (widthMeters <= 0 || heightMeters <= 0) return null;
  const resolution = Math.max(widthMeters / viewport.width, heightMeters / viewport.height);
  return resolution * DPI * INCHES_PER_METER;
}

// SceneView.constraints has no bounds/geometry restriction at all (only
// altitude/tilt/clipDistance) — restrictBounds pans are clamped separately
// via the camera watcher below, but without an altitude cap the user can
// still zoom out past the box, same gap as the 2D case above. Derive the
// "box fills the viewport" altitude the same way ZoomAltitudeConverter
// derives its effective zoom0Altitude: SceneView's fov is measured along the
// viewport DIAGONAL, so ground coverage scales with diagonal pixels, not
// width/height independently.
function altitudeToFitBounds(
  bounds: GeoRectBounds,
  viewport: { width: number; height: number },
): number | null {
  if (!bounds.southWest || !bounds.northEast || viewport.width <= 0 || viewport.height <= 0) return null;
  const sw = toWebMercatorMeters(bounds.southWest.longitude, bounds.southWest.latitude);
  const ne = toWebMercatorMeters(bounds.northEast.longitude, bounds.northEast.latitude);
  const widthMeters = ne.x - sw.x;
  const heightMeters = ne.y - sw.y;
  if (widthMeters <= 0 || heightMeters <= 0) return null;
  const diagonalPx = Math.hypot(viewport.width, viewport.height);
  const halfFovRad = (ZoomAltitudeConverter.SCENE_VIEW_DIAGONAL_FOV_DEG / 2) * (Math.PI / 180);
  const groundPerAltitudeUnit = (2 * Math.tan(halfFovRad)) / diagonalPx;
  return Math.max(widthMeters / (groundPerAltitudeUnit * viewport.width), heightMeters / (groundPerAltitudeUnit * viewport.height));
}

export class ArcGISMapProvider extends MapProvider {
  private resizeObserver: ResizeObserver | null = null;
  private restrictBoundsWatchdog: ReturnType<typeof setInterval> | null = null;

  async initialize(config: ArcGISConfig): Promise<MapViewControllerInterface> {
    if (config.apiKey) esriConfig.apiKey = config.apiKey;

    if (this.controller) {
      return this.controller;
    }

    const container =
      typeof config.container === 'string'
        ? document.getElementById(config.container)
        : config.container;

    if (!container) {
      throw new Error('Container element not found');
    }

    const viewportSize = () => {
      const rect = container.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    };

    const zoomConverter = new ZoomAltitudeConverter(
      ZoomAltitudeConverter.ARCGIS_OPTIMIZED_ZOOM0_ALTITUDE,
      viewportSize,
    );

    const design = config.mapDesignType ?? ArcGISDesign.Streets;
    const basemap = this.createBasemap(design, BM);

    const useSceneView = config.useSceneView !== false;
    const map = new Map({
      basemap,
      ground: useSceneView && design.elevationSources.length > 0
        ? { layers: design.elevationSources.map(url => new ElevationLayer({ url })) }
        : undefined,
    });

    // SceneView.constraints has no bounds/geometry restriction (unlike
    // MapView) — only altitude/tilt/clipDistance. minZoom/maxZoom map to
    // altitude the same way zoom<->altitude conversion works elsewhere in
    // this converter; restrictBounds is enforced by clamping the camera on
    // every change (see below), the same approach Cesium needs.
    const referenceLatitude = config.initCameraPosition?.position.latitude ?? 0;
    const view: __esri.SceneView | __esri.MapView = useSceneView
      ? new SV({
          container: container as HTMLDivElement,
          map,
          camera: config.initCameraPosition
            ? zoomConverter.mapCameraPositionToCameraOptions(config.initCameraPosition) ?? undefined
            : undefined,
          qualityProfile: 'high',
          environment: {
            lighting: {
              type: 'virtual',
              directShadowsEnabled: false,
            },
          },
          // Passing a key with an explicit `undefined` value (rather than
          // omitting it) confuses ArcGIS's Accessor-based constraints and
          // corrupts the initial camera (confirmed empirically: it blew the
          // view out to a near-global scale). Only include keys that have a
          // real value.
          ...(config.minZoom !== undefined || config.maxZoom !== undefined || config.restrictBounds
            ? {
                constraints: {
                  altitude: {
                    ...(config.maxZoom !== undefined
                      ? { min: zoomConverter.zoomLevelToAltitude({ zoomLevel: config.maxZoom, latitude: referenceLatitude, tilt: 0 }) }
                      : {}),
                    ...(config.minZoom !== undefined
                      ? { max: zoomConverter.zoomLevelToAltitude({ zoomLevel: config.minZoom, latitude: referenceLatitude, tilt: 0 }) }
                      : config.restrictBounds
                        ? (() => {
                            const fitAltitude = altitudeToFitBounds(config.restrictBounds!, viewportSize());
                            return fitAltitude != null ? { max: fitAltitude } : {};
                          })()
                        : {}),
                  },
                },
              }
            : {}),
        })
      : new MV({
          container: container as HTMLDivElement,
          map,
          center: config.initCameraPosition
            ? [config.initCameraPosition.position.longitude, config.initCameraPosition.position.latitude]
            : undefined,
          scale: config.initCameraPosition
            ? arcGISZoomToScale(
                config.initCameraPosition.zoom,
                config.initCameraPosition.position.latitude,
              )
            : undefined,
          rotation: config.initCameraPosition?.bearing,
          // Same "omit rather than pass undefined" rule as SceneView's
          // altitude constraints above.
          ...(config.minZoom !== undefined || config.maxZoom !== undefined || config.restrictBounds
            ? {
                constraints: {
                  // Confirmed empirically: ArcGIS's minScale/maxScale are
                  // lower/upper BOUNDS ON THE SCALE NUMBER itself (not
                  // "min/max zoom" by name) — minScale is the largest
                  // reachable scale (zoomed out limit), maxScale is the
                  // smallest reachable scale (zoomed in limit). Since zoom
                  // and scale move in opposite directions, minZoom maps to
                  // minScale and maxZoom maps to maxScale (not swapped).
                  ...(config.minZoom !== undefined
                    ? { minScale: arcGISZoomToScale(config.minZoom, 0) }
                    : config.restrictBounds
                      ? (() => {
                          const fitScale = scaleToFitBounds(config.restrictBounds!, viewportSize());
                          return fitScale != null ? { minScale: fitScale } : {};
                        })()
                      : {}),
                  ...(config.maxZoom !== undefined ? { maxScale: arcGISZoomToScale(config.maxZoom, 0) } : {}),
                  ...(config.restrictBounds
                    ? (() => {
                        const extent = geoRectToExtent(config.restrictBounds);
                        return extent ? { geometry: { ...extent, type: 'extent' as const } } : {};
                      })()
                    : {}),
                },
              }
            : {}),
        });

    Object.assign(container.style, { width: '100%', height: '100%', display: 'block' });

    const markerGraphicsLayer = new GL({ id: 'marker-layer' });
    const circleGraphicsLayer = new GL({ id: 'circle-layer' });
    const polylineGraphicsLayer = new GL({ id: 'polyline-layer' });
    const polygonGraphicsLayer = new GL({ id: 'polygon-layer' });
    // Keep a direct handle on the `LocalMediaElementSource` (rather than
    // reading it back off `mediaLayer.source`, whose getter type is a union
    // with bare `ImageElement`/`VideoElement`) so the ground-image renderer
    // can add/remove elements via a plainly-typed `elements` Collection.
    const groundImageSource = new LMS({ elements: [] });
    const groundImageMediaLayer = new ML({ id: 'ground-image-layer', source: groundImageSource });

    // Layer order = draw order. Mirrors the overlay stacking convention in
    // js-sdk-core's controllers: groundImage(2) < circle/polygon(3) <
    // polyline(5) < marker(10).
    map.addMany([
      groundImageMediaLayer,
      polygonGraphicsLayer,
      circleGraphicsLayer,
      polylineGraphicsLayer,
      markerGraphicsLayer,
    ]);

    await view.when();

    const holder = new ArcGISViewHolder(container, view, zoomConverter);
    const markerController = getMarkerController(holder, markerGraphicsLayer, config);
    const circleController = getCircleController(holder, circleGraphicsLayer);
    const polylineController = getPolylineController(holder, polylineGraphicsLayer);
    const polygonController = getPolygonController(holder, polygonGraphicsLayer);
    const groundImageController = getGroundImageController(holder, groundImageSource.elements);
    const rasterLayerController = getRasterLayerController(holder);

    const controller = new ArcGISMapViewController(
      holder,
      markerController,
      circleController,
      polylineController,
      polygonController,
      groundImageController,
      rasterLayerController,
      design,
    );
    this.controller = controller;

    // SceneView has no native pan-bounds constraint (unlike MapView's
    // `geometry`), and the native `constraints.altitude.max` only stops the
    // camera drifting straight up — it doesn't re-center a box that's been
    // dragged off to one side, nor does it account for the current tilt. Once
    // the gesture settles, snap back into a proper fit using the same
    // goTo(extent)-based fitBounds() the public API exposes, rather than a
    // hand-rolled per-axis clamp (which fought the altitude constraint's own
    // rubber-band animation and froze the view — see the fitAltitude comment
    // above for the discarded approach). Reacting only to `stationary` (not
    // every camera change) keeps this from re-triggering itself: once fit,
    // the view is back within tolerance and the next check is a no-op.
    const bounds = config.restrictBounds;
    if (view.type === '3d' && bounds?.southWest && bounds.northEast) {
      const sw = bounds.southWest;
      const ne = bounds.northEast;
      const EPSILON_DEG = 1e-9;
      const ALTITUDE_TOLERANCE_METERS = 1;

      const isOutOfBounds = (): boolean => {
        const camera = view.camera;
        const lon = camera?.position.longitude;
        const lat = camera?.position.latitude;
        if (lon == null || lat == null || Number.isNaN(lon) || Number.isNaN(lat)) return true;
        const fitAltitude = altitudeToFitBounds(bounds, viewportSize());
        const zoomedOutPastFit =
          fitAltitude != null && (camera!.position.z ?? 0) > fitAltitude + ALTITUDE_TOLERANCE_METERS;
        const pannedOutOfBounds =
          lon < sw.longitude - EPSILON_DEG ||
          lon > ne.longitude + EPSILON_DEG ||
          lat < sw.latitude - EPSILON_DEG ||
          lat > ne.latitude + EPSILON_DEG;
        return zoomedOutPastFit || pannedOutOfBounds;
      };

      // A much farther-out threshold than isOutOfBounds(): panning to where
      // the box is completely off-screen means the drag gesture's ground ray
      // no longer hits anything, so SceneView has nothing to derive a pan
      // delta from — the drag silently does nothing, `stationary` never
      // toggles, and the gesture-end correction above never runs, leaving
      // the user stuck with no way to drag back. "Off-screen" depends on the
      // current altitude (how much ground the diagonal FOV covers), not the
      // box's own size — a box-size-relative threshold undershoots as soon
      // as the camera is zoomed in closer than the box itself, which is the
      // common case. Reuse the same diagonal-FOV ground-coverage math as
      // altitudeToFitBounds, in Web Mercator meters, and only treat it as
      // severe once the box's circumscribed circle can no longer overlap the
      // visible ground circle at all.
      const centerMerc = toWebMercatorMeters(
        (sw.longitude + ne.longitude) / 2,
        (sw.latitude + ne.latitude) / 2,
      );
      const swMerc = toWebMercatorMeters(sw.longitude, sw.latitude);
      const neMerc = toWebMercatorMeters(ne.longitude, ne.latitude);
      const boxHalfDiagonalMeters = Math.hypot(neMerc.x - swMerc.x, neMerc.y - swMerc.y) / 2;
      const halfFovRad = (ZoomAltitudeConverter.SCENE_VIEW_DIAGONAL_FOV_DEG / 2) * (Math.PI / 180);
      const isSeverelyOutOfView = (): boolean => {
        const camera = view.camera;
        const lon = camera?.position.longitude;
        const lat = camera?.position.latitude;
        if (lon == null || lat == null || Number.isNaN(lon) || Number.isNaN(lat)) return true;
        const altitude = camera!.position.z;
        if (altitude == null || Number.isNaN(altitude)) return true;
        // Nadir-view ground radius; an actual tilted camera sees farther
        // toward the horizon, so this underestimates visible ground and
        // errs toward recovering slightly early rather than staying stuck.
        const groundRadiusMeters = Math.max(altitude, 0) * Math.tan(halfFovRad);
        const cameraMerc = toWebMercatorMeters(lon, lat);
        const distanceMeters = Math.hypot(cameraMerc.x - centerMerc.x, cameraMerc.y - centerMerc.y);
        return distanceMeters > groundRadiusMeters + boxHalfDiagonalMeters;
      };

      let recovering = false;
      const recover = () => {
        if (recovering) return;
        recovering = true;
        controller.fitBounds(bounds, { padding: 0 }).finally(() => {
          recovering = false;
        });
      };

      reactiveUtils.watch(() => view.stationary, (stationary) => {
        if (stationary && isOutOfBounds()) recover();
      });

      // Best-effort: cancels the native drag outright once it goes severely
      // out of view, in case SceneView still emits 'drag' events in that
      // state. Backed by a polling watchdog below regardless, since it's not
      // guaranteed 'drag' keeps firing once the ground ray stops resolving.
      view.on('drag', (event) => {
        if (!isSeverelyOutOfView()) return;
        event.stopPropagation();
        recover();
      });

      this.restrictBoundsWatchdog = setInterval(() => {
        if (isSeverelyOutOfView()) recover();
      }, 300);
    }

    let previousWidth = viewportSize().width;
    let previousHeight = viewportSize().height;
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        const nextSize = viewportSize();
        const { width: nextWidth, height: nextHeight } = nextSize;
        if (nextHeight <= 0 || (nextWidth === previousWidth && nextHeight === previousHeight)) return;

        {
          const sceneView = view.type === '3d' ? view : null;
          const camera = sceneView?.camera;
          // The zoom<->altitude mapping is tied to the viewport diagonal (the
          // SceneView fov is diagonal; see ZoomAltitudeConverter), so keep the
          // on-screen extent stable by scaling altitude with the diagonal.
          const previousDiagonal = Math.hypot(previousWidth, previousHeight);
          const nextDiagonal = Math.hypot(nextWidth, nextHeight);
          if (camera && previousDiagonal > 0 && nextDiagonal !== previousDiagonal) {
            const ratio = nextDiagonal / previousDiagonal;
            sceneView.camera = {
              ...camera,
              position: {
                ...camera.position,
                z: (camera.position.z ?? 0) * ratio,
              },
            };
          }
        }

        previousWidth = nextWidth;
        previousHeight = nextHeight;
        // Viewport-height changes shift the zoom<->altitude conversion (see
        // ZoomAltitudeConverter), so re-derive and broadcast the camera position
        // instead of leaving listeners with a stale zoom until the next real move.
        controller.notifyViewportResized();
      });
      this.resizeObserver.observe(container);
    }

    return controller;
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.restrictBoundsWatchdog != null) {
      clearInterval(this.restrictBoundsWatchdog);
      this.restrictBoundsWatchdog = null;
    }
    if (this.controller) {
      this.controller.destroy();
      this.controller = null;
    }
  }

  private createBasemap(
    designType: import('./ArcGISMapDesign').ArcGISDesignTypeInterface,
    BasemapConstructor: typeof import('@arcgis/core/Basemap').default,
  ): __esri.Basemap {
    return new BasemapConstructor({
      style: { id: ArcGISDesign.toBasemapStyle(designType) },
    });
  }
}

function getRasterLayerController(holder: ArcGISViewHolder): ArcGISRasterLayerController {
  const renderer = new ArcGISRasterLayerOverlayRenderer(holder);
  return new ArcGISRasterLayerController(renderer);
}

function getMarkerController(
  holder: ArcGISViewHolder,
  markerLayer: __esri.GraphicsLayer,
  config: ArcGISConfig,
): ArcGISMarkerController {
  const markerRenderer = new ArcGISMarkerRenderer(holder, markerLayer);
  return new ArcGISMarkerController(markerRenderer, config.markerTilingOptions);
}

function getCircleController(holder: ArcGISViewHolder, circleLayer: __esri.GraphicsLayer): ArcGISCircleOverlayController {
  const renderer = new ArcGISCircleOverlayRenderer(holder, circleLayer);
  return new ArcGISCircleOverlayController(renderer);
}

function getPolylineController(holder: ArcGISViewHolder, polylineLayer: __esri.GraphicsLayer): ArcGISPolylineOverlayController {
  const renderer = new ArcGISPolylineOverlayRenderer(holder, polylineLayer);
  return new ArcGISPolylineOverlayController(renderer);
}

function getPolygonController(holder: ArcGISViewHolder, polygonLayer: __esri.GraphicsLayer): ArcGISPolygonOverlayController {
  const renderer = new ArcGISPolygonOverlayRenderer(holder, polygonLayer);
  return new ArcGISPolygonOverlayController(renderer);
}

function getGroundImageController(holder: ArcGISViewHolder, groundImageElements: __esri.Collection<__esri.MediaElement>): ArcGISGroundImageController {
  const renderer = new ArcGISGroundImageOverlayRenderer(holder, groundImageElements);
  return new ArcGISGroundImageController(renderer);
}
