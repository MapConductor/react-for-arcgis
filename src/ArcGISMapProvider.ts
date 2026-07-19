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
export class ArcGISMapProvider extends MapProvider {
  private resizeObserver: ResizeObserver | null = null;

  async initialize(config: ArcGISConfig): Promise<MapViewControllerInterface> {
    const [mapModule, graphicsLayerModule, basemapModule, sceneViewModule, mapViewModule, configModule, elevationLayerModule] = await Promise.all([
      import('@arcgis/core/Map'),
      import('@arcgis/core/layers/GraphicsLayer'),
      import('@arcgis/core/Basemap'),
      import('@arcgis/core/views/SceneView'),
      import('@arcgis/core/views/MapView'),
      import('@arcgis/core/config'),
      import('@arcgis/core/layers/ElevationLayer'),
    ]);
    const Map = mapModule.default;
    const GL = graphicsLayerModule.default;
    const BM = basemapModule.default;
    const SV = sceneViewModule.default;
    const MV = mapViewModule.default;
    const ElevationLayer = elevationLayerModule.default;

    if (config.apiKey) configModule.default.apiKey = config.apiKey;

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
        });

    Object.assign(container.style, { width: '100%', height: '100%', display: 'block' });

    const markerGraphicsLayer = new GL({ id: 'marker-layer' });
    const circleGraphicsLayer = new GL({ id: 'circle-layer' });
    const polylineGraphicsLayer = new GL({ id: 'polyline-layer' });
    const polygonGraphicsLayer = new GL({ id: 'polygon-layer' });
    const groundImageGraphicsLayer = new GL({ id: 'ground-image-layer' });

    map.addMany([
      groundImageGraphicsLayer,
      polygonGraphicsLayer,
      polylineGraphicsLayer,
      circleGraphicsLayer,
      markerGraphicsLayer,
    ]);

    await view.when();

    const holder = new ArcGISViewHolder(container, view, zoomConverter);
    const markerController = getMarkerController(holder, markerGraphicsLayer, config);
    const circleController = getCircleController(holder, circleGraphicsLayer);
    const polylineController = getPolylineController(holder, polylineGraphicsLayer);
    const polygonController = getPolygonController(holder, polygonGraphicsLayer);
    const groundImageController = getGroundImageController(holder, groundImageGraphicsLayer);
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

    let previousWidth = viewportSize().width;
    let previousHeight = viewportSize().height;
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        const nextSize = viewportSize();
        const { width: nextWidth, height: nextHeight } = nextSize;
        if (nextHeight <= 0 || (nextWidth === previousWidth && nextHeight === previousHeight)) return;

        if (nextHeight !== previousHeight) {
          const sceneView = view.type === '3d' ? view : null;
          const camera = sceneView?.camera;
          if (camera) {
            const previousEffectiveHeight = previousHeight > 0
              ? previousHeight
              : ZoomAltitudeConverter.REFERENCE_VIEWPORT_HEIGHT_PX;
            const ratio = nextHeight / previousEffectiveHeight;
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

function getGroundImageController(holder: ArcGISViewHolder, groundImageLayer: __esri.GraphicsLayer): ArcGISGroundImageController {
  const renderer = new ArcGISGroundImageOverlayRenderer(holder, groundImageLayer);
  return new ArcGISGroundImageController(renderer);
}
