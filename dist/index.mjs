// src/ArcGISMapProvider.ts
import { MapProvider } from "@mapconductor/js-sdk-core";

// src/ArcGISMapViewController.ts
import {
  BaseMapViewController,
  createGeoPoint,
  createMapCameraPosition,
  createGeoRectBounds
} from "@mapconductor/js-sdk-core";

// src/ArcGISMapDesign.ts
var _ArcGISDesign = class _ArcGISDesign {
  constructor(id, elevationSources = [], attributionRules = []) {
    this.id = id;
    this.elevationSources = elevationSources;
    this.attributionRules = attributionRules;
  }
  getValue() {
    return this.id;
  }
  withElevationSources(sources) {
    return new _ArcGISDesign(this.id, sources, this.attributionRules);
  }
  static Create(id, sources = []) {
    const design = _ArcGISDesign.designs.get(id);
    if (!design) throw new Error(`unknown design id: "${id}"`);
    return sources.length === 0 ? design : design.withElevationSources(sources);
  }
  static toBasemapStyle(designType) {
    const id = _ArcGISDesign.Create(designType.getValue()).id;
    const prefix = id.startsWith("arc_gis_") ? "arcgis/" : "osm/";
    const value = id.replace(/^arc_gis_|^osm_/, "").replace(/_(standard|labels|base|detail|night|dark)$/, "/$1").replace(/_/g, "-");
    return `${prefix}${value}`;
  }
};
_ArcGISDesign.Streets = new _ArcGISDesign("arc_gis_streets");
_ArcGISDesign.Imagery = new _ArcGISDesign("arc_gis_imagery");
_ArcGISDesign.ImageryStandard = new _ArcGISDesign("arc_gis_imagery_standard");
_ArcGISDesign.ImageryLabels = new _ArcGISDesign("arc_gis_imagery_labels");
_ArcGISDesign.LightGray = new _ArcGISDesign("arc_gis_light_gray");
_ArcGISDesign.LightGrayBase = new _ArcGISDesign("arc_gis_light_gray_base");
_ArcGISDesign.LightGrayLabels = new _ArcGISDesign("arc_gis_light_gray_labels");
_ArcGISDesign.DarkGray = new _ArcGISDesign("arc_gis_dark_gray");
_ArcGISDesign.DarkGrayBase = new _ArcGISDesign("arc_gis_dark_gray_base");
_ArcGISDesign.DarkGrayLabels = new _ArcGISDesign("arc_gis_dark_gray_labels");
_ArcGISDesign.Navigation = new _ArcGISDesign("arc_gis_navigation");
_ArcGISDesign.NavigationNight = new _ArcGISDesign("arc_gis_navigation_night");
_ArcGISDesign.StreetsNight = new _ArcGISDesign("arc_gis_streets_night");
_ArcGISDesign.StreetsRelief = new _ArcGISDesign("arc_gis_streets_relief");
_ArcGISDesign.Topographic = new _ArcGISDesign("arc_gis_topographic");
_ArcGISDesign.Oceans = new _ArcGISDesign("arc_gis_oceans");
_ArcGISDesign.OceansBase = new _ArcGISDesign("arc_gis_oceans_base");
_ArcGISDesign.OceansLabels = new _ArcGISDesign("arc_gis_oceans_labels");
_ArcGISDesign.Terrain = new _ArcGISDesign("arc_gis_terrain");
_ArcGISDesign.TerrainBase = new _ArcGISDesign("arc_gis_terrain_base");
_ArcGISDesign.TerrainDetail = new _ArcGISDesign("arc_gis_terrain_detail");
_ArcGISDesign.Community = new _ArcGISDesign("arc_gis_community");
_ArcGISDesign.ChartedTerritory = new _ArcGISDesign("arc_gis_charted_territory");
_ArcGISDesign.ColoredPencil = new _ArcGISDesign("arc_gis_colored_pencil");
_ArcGISDesign.Nova = new _ArcGISDesign("arc_gis_nova");
_ArcGISDesign.ModernAntique = new _ArcGISDesign("arc_gis_modern_antique");
_ArcGISDesign.Midcentury = new _ArcGISDesign("arc_gis_midcentury");
_ArcGISDesign.Newspaper = new _ArcGISDesign("arc_gis_newspaper");
_ArcGISDesign.HillshadeLight = new _ArcGISDesign("arc_gis_hillshade_light");
_ArcGISDesign.HillshadeDark = new _ArcGISDesign("arc_gis_hillshade_dark");
_ArcGISDesign.StreetsReliefBase = new _ArcGISDesign("arc_gis_streets_relief_base");
_ArcGISDesign.TopographicBase = new _ArcGISDesign("arc_gis_topographic_base");
_ArcGISDesign.ChartedTerritoryBase = new _ArcGISDesign("arc_gis_charted_territory_base");
_ArcGISDesign.ModernAntiqueBase = new _ArcGISDesign("arc_gis_modern_antique_base");
_ArcGISDesign.HumanGeography = new _ArcGISDesign("arc_gis_human_geography");
_ArcGISDesign.HumanGeographyBase = new _ArcGISDesign("arc_gis_human_geography_base");
_ArcGISDesign.HumanGeographyDetail = new _ArcGISDesign("arc_gis_human_geography_detail");
_ArcGISDesign.HumanGeographyLabels = new _ArcGISDesign("arc_gis_human_geography_labels");
_ArcGISDesign.HumanGeographyDark = new _ArcGISDesign("arc_gis_human_geography_dark");
_ArcGISDesign.HumanGeographyDarkBase = new _ArcGISDesign("arc_gis_human_geography_dark_base");
_ArcGISDesign.HumanGeographyDarkDetail = new _ArcGISDesign("arc_gis_human_geography_dark_detail");
_ArcGISDesign.HumanGeographyDarkLabels = new _ArcGISDesign("arc_gis_human_geography_dark_labels");
_ArcGISDesign.Outdoor = new _ArcGISDesign("arc_gis_outdoor");
_ArcGISDesign.OsmStandard = new _ArcGISDesign("osm_standard");
_ArcGISDesign.OsmStandardRelief = new _ArcGISDesign("osm_standard_relief");
_ArcGISDesign.OsmStandardReliefBase = new _ArcGISDesign("osm_standard_relief_base");
_ArcGISDesign.OsmStreets = new _ArcGISDesign("osm_streets");
_ArcGISDesign.OsmStreetsRelief = new _ArcGISDesign("osm_streets_relief");
_ArcGISDesign.OsmLightGray = new _ArcGISDesign("osm_light_gray");
_ArcGISDesign.OsmLightGrayBase = new _ArcGISDesign("osm_light_gray_base");
_ArcGISDesign.OsmLightGrayLabels = new _ArcGISDesign("osm_light_gray_labels");
_ArcGISDesign.OsmDarkGray = new _ArcGISDesign("osm_dark_gray");
_ArcGISDesign.OsmDarkGrayBase = new _ArcGISDesign("osm_dark_gray_base");
_ArcGISDesign.OsmDarkGrayLabels = new _ArcGISDesign("osm_dark_gray_labels");
_ArcGISDesign.OsmStreetsReliefBase = new _ArcGISDesign("osm_streets_relief_base");
_ArcGISDesign.OsmBlueprint = new _ArcGISDesign("osm_blueprint");
_ArcGISDesign.OsmHybrid = new _ArcGISDesign("osm_hybrid");
_ArcGISDesign.OsmHybridDetail = new _ArcGISDesign("osm_hybrid_detail");
_ArcGISDesign.OsmNavigation = new _ArcGISDesign("osm_navigation");
_ArcGISDesign.OsmNavigationDark = new _ArcGISDesign("osm_navigation_dark");
_ArcGISDesign.designs = new Map(
  Object.values(_ArcGISDesign).filter((value) => value instanceof _ArcGISDesign).map((value) => [value.id, value])
);
var ArcGISDesign = _ArcGISDesign;

// src/ArcGISMapViewController.ts
import Basemap from "@arcgis/core/Basemap";
var WEB_MERCATOR_CIRCUMFERENCE_METERS = 2 * Math.PI * 6378137;
var TILE_SIZE = 256;
var DPI = 96;
var INCHES_PER_METER = 39.37;
function arcGISZoomToScale(zoom, latitude) {
  void latitude;
  const resolution = WEB_MERCATOR_CIRCUMFERENCE_METERS / (TILE_SIZE * 2 ** zoom);
  return resolution * DPI * INCHES_PER_METER;
}
function arcGISScaleToZoom(scale, latitude) {
  void latitude;
  const resolution = scale / (DPI * INCHES_PER_METER);
  return Math.log(WEB_MERCATOR_CIRCUMFERENCE_METERS / (TILE_SIZE * resolution)) / Math.log(2);
}
var ArcGISMapViewController = class extends BaseMapViewController {
  constructor(holder, markerController, circleController, polylineController, polygonController, groundImageController, rasterLayerController, mapDesignType = ArcGISDesign.Streets) {
    super();
    this.holder = holder;
    this.markerController = markerController;
    this.circleController = circleController;
    this.polylineController = polylineController;
    this.polygonController = polygonController;
    this.groundImageController = groundImageController;
    this.rasterLayerController = rasterLayerController;
    this.eventCleanup = [];
    this.initialized = false;
    this.mapDesignTypeChangeListener = null;
    this.mapDesignType = mapDesignType;
    this.setupEventListeners();
  }
  getMap() {
    return this.holder.map;
  }
  setMapDesignType(value) {
    this.mapDesignType = value;
    const map = this.holder.map.map;
    if (map) {
      map.basemap = new Basemap({
        style: { id: ArcGISDesign.toBasemapStyle(value) }
      });
    }
    this.mapDesignTypeChangeListener?.(value);
  }
  setMapDesignTypeChangeListener(listener) {
    this.mapDesignTypeChangeListener = listener;
    listener?.(this.mapDesignType);
  }
  setupEventListeners() {
    const view = this.holder.map;
    if (view.ready) this.initialized = true;
    let isMoving = false;
    const notifyMoveStartIfNeeded = () => {
      if (!isMoving) {
        isMoving = true;
        const camera = this.getCameraPosition();
        if (camera) this.notifyCameraMoveStart(camera);
      }
    };
    const handleViewpointChange = () => {
      if (!view.stationary) notifyMoveStartIfNeeded();
      if (!isMoving) return;
      const camera = this.getCameraPosition();
      if (camera) this.notifyCameraMove(camera);
    };
    const handleStationaryChange = (stationary) => {
      if (!stationary) {
        notifyMoveStartIfNeeded();
        return;
      }
      if (!isMoving) return;
      const camera = this.getCameraPosition();
      if (camera) {
        this.notifyCameraMove(camera);
        this.notifyCameraMoveEnd(camera);
      }
      isMoving = false;
    };
    const handleClick = async (event) => {
      const position = event.mapPoint;
      if (!position) return;
      const point = createGeoPoint({
        latitude: position.latitude ?? 0,
        longitude: position.longitude ?? 0,
        altitude: position.z ?? void 0
      });
      if (await this.handleMarkerClick(event)) return;
      if (await this.handleCircleClick(event, point)) return;
      if (await this.handlePolygonClick(event, point)) return;
      if (await this.handlePolylineClick(event)) return;
      if (await this.handleGroundImageClick(event, point)) return;
      this.notifyMapClick(point);
    };
    const eventView = view;
    const cameraWatchProperty = view.type === "3d" ? ["camera", "viewpoint"] : "viewpoint";
    const handles = [
      eventView.on("click", handleClick),
      eventView.on("layerview-create", () => {
        this.initialized = true;
        this.notifyMapInitialized();
      }),
      eventView.watch(cameraWatchProperty, handleViewpointChange),
      eventView.watch("stationary", handleStationaryChange)
    ];
    this.eventCleanup.push(() => handles.forEach((handle) => handle?.remove()));
  }
  setMapInitializedListener(listener) {
    super.setMapInitializedListener(listener);
    if (listener && this.initialized) this.notifyMapInitialized();
  }
  /**
   * Called by the provider's ResizeObserver when the view container's size
   * changes. getCameraPosition() re-derives zoom from the current viewport
   * height (see ZoomAltitudeConverter), so this just needs to push a fresh
   * notification through the usual channel instead of leaving listeners with
   * a stale zoom until the next real camera move.
   */
  notifyViewportResized() {
    const camera = this.getCameraPosition();
    if (!camera) return;
    this.notifyCameraMove(camera);
    this.notifyCameraMoveEnd(camera);
  }
  moveCamera(position) {
    if (this.holder.map.type === "2d") {
      return this.holder.map.goTo({
        center: [position.position.longitude, position.position.latitude],
        scale: arcGISZoomToScale(position.zoom, position.position.latitude),
        rotation: position.bearing
      }).then(() => true).catch(() => false);
    }
    const cameraOptions = this.holder.zoomConverter.mapCameraPositionToCameraOptions(position);
    if (!cameraOptions) return Promise.resolve(false);
    return this.holder.map.goTo(cameraOptions).then(() => true).catch(() => false);
  }
  async animateCamera(position, options) {
    if (this.holder.map.type === "2d") {
      const duration2 = options?.duration ?? 1e3;
      return this.holder.map.goTo({
        center: [position.position.longitude, position.position.latitude],
        scale: arcGISZoomToScale(position.zoom, position.position.latitude),
        rotation: position.bearing
      }, { duration: duration2 }).then(() => true).catch(() => false);
    }
    const cameraOptions = this.holder.zoomConverter.mapCameraPositionToCameraOptions(position);
    if (!cameraOptions) return Promise.resolve(false);
    const duration = options?.duration ?? 1e3;
    return this.holder.map.goTo(cameraOptions, { duration, speedFactor: 1 }).then(() => true).catch(() => false);
  }
  async fitBounds(bounds, options) {
    if (!bounds.southWest || !bounds.northEast) return Promise.resolve(false);
    const extent = {
      xmin: bounds.southWest.longitude,
      ymin: bounds.southWest.latitude,
      xmax: bounds.northEast.longitude,
      ymax: bounds.northEast.latitude,
      spatialReference: { wkid: 4326 }
    };
    const padding = options?.padding ?? 64;
    return this.holder.map.goTo(extent, { padding }).then(() => true).catch(() => false);
  }
  getCameraPosition() {
    if (this.holder.map.type === "2d") {
      const view = this.holder.map;
      const center = view.center;
      if (!center) return null;
      return createMapCameraPosition({
        position: createGeoPoint({
          latitude: center.latitude ?? center.y,
          longitude: center.longitude ?? center.x
        }),
        zoom: arcGISScaleToZoom(view.scale, center.latitude ?? center.y),
        bearing: view.rotation,
        tilt: 0,
        visibleRegion: this.getVisibleRegion()
      });
    }
    const camera = this.holder.map.camera;
    if (!camera) return null;
    const latitude = camera.position.latitude ?? camera.position.y ?? 0;
    const longitude = camera.position.longitude ?? camera.position.x ?? 0;
    const zoom = this.holder.zoomConverter.altitudeToZoomLevel({
      altitude: camera.position.z ?? 0,
      latitude,
      tilt: camera.tilt ?? 0
    });
    return createMapCameraPosition({
      position: createGeoPoint({
        latitude,
        longitude,
        altitude: camera.position.z ?? void 0
      }),
      zoom,
      bearing: camera.heading ?? 0,
      tilt: camera.tilt ?? 0,
      visibleRegion: this.getVisibleRegion()
    });
  }
  getBounds() {
    return this.getVisibleRegion()?.bounds ?? null;
  }
  getVisibleRegion() {
    const extent = this.holder.map.extent;
    if (!extent) return null;
    const bounds = createGeoRectBounds();
    bounds.extend(createGeoPoint({
      latitude: extent.ymin,
      longitude: extent.xmin
    }));
    bounds.extend(createGeoPoint({
      latitude: extent.ymax,
      longitude: extent.xmax
    }));
    return {
      bounds,
      nearLeft: createGeoPoint({
        latitude: extent.ymin,
        longitude: extent.xmin
      }),
      nearRight: createGeoPoint({
        latitude: extent.ymin,
        longitude: extent.xmax
      }),
      farLeft: createGeoPoint({
        latitude: extent.ymax,
        longitude: extent.xmin
      }),
      farRight: createGeoPoint({
        latitude: extent.ymax,
        longitude: extent.xmax
      })
    };
  }
  async handleMarkerClick(event) {
    const screenPoint = { x: event.x, y: event.y };
    const position = this.holder.fromScreenOffsetSync(screenPoint);
    if (!position) return false;
    const marker = this.markerController.find(position);
    if (marker) {
      this.markerController.dispatchClick(marker.state);
      return true;
    }
    return false;
  }
  async handleCircleClick(event, clicked) {
    const screenPoint = { x: event.x, y: event.y };
    const position = this.holder.fromScreenOffsetSync(screenPoint);
    if (!position) return false;
    const circle = this.circleController.find(position);
    if (circle) {
      const circleEvent = { state: circle.state, clicked };
      this.circleController.dispatchClick(circleEvent);
      return true;
    }
    return false;
  }
  async handlePolygonClick(event, clicked) {
    const screenPoint = { x: event.x, y: event.y };
    const position = this.holder.fromScreenOffsetSync(screenPoint);
    if (!position) return false;
    const polygon = this.polygonController.find(position);
    if (polygon) {
      const polygonEvent = { state: polygon.state, clicked };
      this.polygonController.dispatchClick(polygonEvent);
      return true;
    }
    return false;
  }
  async handlePolylineClick(event) {
    const screenPoint = { x: event.x, y: event.y };
    const position = this.holder.fromScreenOffsetSync(screenPoint);
    if (!position) return false;
    const hitResult = this.polylineController.findWithClosestPoint(position);
    if (hitResult) {
      const polylineEvent = {
        state: hitResult.entity.state,
        clicked: hitResult.closestPoint
      };
      this.polylineController.dispatchClick(polylineEvent);
      return true;
    }
    return false;
  }
  async handleGroundImageClick(event, clicked) {
    const screenPoint = { x: event.x, y: event.y };
    const position = this.holder.fromScreenOffsetSync(screenPoint);
    if (!position) return false;
    const groundImage = this.groundImageController.find(position);
    if (groundImage) {
      const groundImageEvent = { state: groundImage.state, clicked };
      this.groundImageController.dispatchClick(groundImageEvent);
      return true;
    }
    return false;
  }
  async compositionMarkers(data) {
    await this.markerController.composition(data);
  }
  async updateMarker(state) {
    await this.markerController.update(state);
  }
  hasMarker(state) {
    return this.markerController.has(state);
  }
  setOnMarkerClickListener(listener) {
    this.markerController.setOnClickListener(listener);
  }
  setOnMarkerDragStart(listener) {
    this.markerController.setOnDragStart(listener);
  }
  setOnMarkerDrag(listener) {
    this.markerController.setOnDrag(listener);
  }
  setOnMarkerDragEnd(listener) {
    this.markerController.setOnDragEnd(listener);
  }
  setOnMarkerAnimateStart(listener) {
    this.markerController.setOnAnimateStart(listener);
  }
  setOnMarkerAnimateEnd(listener) {
    this.markerController.setOnAnimateEnd(listener);
  }
  setMarkerAnimationOverlayHost(host) {
    this.markerController.setMarkerAnimationOverlayHost(host);
  }
  setOnCircleClickListener(listener) {
    this.circleController.setOnClickListener(listener);
  }
  setOnPolylineClickListener(listener) {
    this.polylineController.setOnClickListener(listener);
  }
  setOnPolygonClickListener(listener) {
    this.polygonController.setOnClickListener(listener);
  }
  setOnGroundImageClickListener(listener) {
    this.groundImageController.setOnClickListener(listener);
  }
  async compositionCircles(data) {
    await this.circleController.composition(data);
  }
  async updateCircle(state) {
    await this.circleController.update(state);
  }
  hasCircle(state) {
    return this.circleController.has(state);
  }
  async compositionPolylines(data) {
    await this.polylineController.composition(data);
  }
  async updatePolyline(state) {
    await this.polylineController.update(state);
  }
  hasPolyline(state) {
    return this.polylineController.has(state);
  }
  async compositionPolygons(data) {
    await this.polygonController.composition(data);
  }
  async updatePolygon(state) {
    await this.polygonController.update(state);
  }
  hasPolygon(state) {
    return this.polygonController.has(state);
  }
  async compositionGroundImages(data) {
    await this.groundImageController.composition(data);
  }
  async updateGroundImage(state) {
    await this.groundImageController.update(state);
  }
  hasGroundImage(state) {
    return this.groundImageController.has(state);
  }
  async compositionRasterLayers(data) {
    await this.rasterLayerController.composition(data);
  }
  async updateRasterLayer(state) {
    await this.rasterLayerController.update(state);
  }
  hasRasterLayer(state) {
    return this.rasterLayerController.has(state);
  }
  async clearOverlays() {
    this.markerController.clear();
    this.circleController.clear();
    this.polylineController.clear();
    this.polygonController.clear();
    this.groundImageController.clear();
    this.rasterLayerController.clear();
  }
  destroy() {
    void this.clearOverlays();
    for (const fn of this.eventCleanup) fn();
    this.eventCleanup.length = 0;
  }
};

// src/ArcGISViewHolder.ts
import {
  MapViewHolderBase,
  createGeoPoint as createGeoPoint2
} from "@mapconductor/js-sdk-core";
var ArcGISViewHolder = class extends MapViewHolderBase {
  constructor(mapView, map, zoomConverter) {
    super();
    this.mapView = mapView;
    this.map = map;
    this.zoomConverter = zoomConverter;
  }
  toScreenOffset(position) {
    try {
      const point = {
        type: "point",
        longitude: position.longitude,
        latitude: position.latitude,
        spatialReference: { wkid: 4326 }
      };
      const screenPoint = this.map.toScreen(point);
      if (!screenPoint) return null;
      return {
        x: screenPoint.x,
        y: screenPoint.y
      };
    } catch (e) {
      return null;
    }
  }
  async fromScreenOffset(offset) {
    return this.fromScreenOffsetSync(offset);
  }
  fromScreenOffsetSync(offset) {
    try {
      const screenPoint = {
        x: offset.x,
        y: offset.y
      };
      const point = this.map.toMap(screenPoint);
      if (!point) return null;
      return createGeoPoint2({
        latitude: point.latitude ?? 0,
        longitude: point.longitude ?? 0,
        altitude: point.z ?? void 0
      });
    } catch (e) {
      return null;
    }
  }
};

// src/marker/ArcGISMarkerController.ts
import { MarkerTilingOptions as MarkerTilingOptions2 } from "@mapconductor/js-sdk-core";

// src/marker/AbstractArcGISController.ts
import {
  AbstractMarkerController,
  MarkerManager,
  MarkerTilingOptions
} from "@mapconductor/js-sdk-core";
var AbstractArcGISController = class extends AbstractMarkerController {
  constructor(renderer, _tilingOptions = MarkerTilingOptions.Default) {
    super({
      markerManager: MarkerManager.defaultManager(
        null,
        _tilingOptions.minMarkerCount
      ),
      renderer
    });
  }
  async composition(data) {
    await this.add(data);
  }
  has(state) {
    return this.markerManager.hasEntity(state.id);
  }
  find(position) {
    return this.markerManager.findNearest(position);
  }
  setOnClickListener(listener) {
    this.clickListener = listener;
  }
  setOnDragStart(listener) {
    this.dragStartListener = listener;
  }
  setOnDrag(listener) {
    this.dragListener = listener;
  }
  setOnDragEnd(listener) {
    this.dragEndListener = listener;
  }
  setOnAnimateStart(listener) {
    this.animateStartListener = listener;
  }
  setOnAnimateEnd(listener) {
    this.animateEndListener = listener;
  }
  onMarkerAdded(entity) {
    if (entity.marker) {
      this.attachListeners(entity.marker, entity.state);
    }
  }
};

// src/marker/ArcGISMarkerController.ts
var ArcGISMarkerController = class extends AbstractArcGISController {
  constructor(renderer, tilingOptions = MarkerTilingOptions2.Default) {
    super(renderer, tilingOptions);
  }
  attachListeners(_marker, _state) {
  }
};

// src/circle/ArcGISCircleController.ts
import {
  CircleController,
  CircleManager
} from "@mapconductor/js-sdk-core";
var ArcGISCircleOverlayController = class extends CircleController {
  constructor(renderer) {
    super({
      circleManager: new CircleManager(),
      renderer
    });
  }
  async composition(data) {
    await this.add(data);
  }
  has(state) {
    return this.circleManager.hasEntity(state.id);
  }
  setOnClickListener(listener) {
    this.clickListener = listener;
  }
  // Click handling is done at the view level
};

// src/polyline/ArcGISPolylineController.ts
import {
  PolylineController,
  PolylineManager
} from "@mapconductor/js-sdk-core";
var ArcGISPolylineOverlayController = class extends PolylineController {
  constructor(renderer) {
    super({
      polylineManager: new PolylineManager(),
      renderer
    });
  }
  async composition(data) {
    await this.add(data);
  }
  has(state) {
    return this.polylineManager.hasEntity(state.id);
  }
  setOnClickListener(listener) {
    this.clickListener = listener;
  }
};

// src/polygon/ArcGISPolygonController.ts
import {
  PolygonController,
  PolygonManager
} from "@mapconductor/js-sdk-core";
var ArcGISPolygonOverlayController = class extends PolygonController {
  constructor(renderer) {
    super({
      polygonManager: new PolygonManager(),
      renderer
    });
  }
  async composition(data) {
    await this.add(data);
  }
  has(state) {
    return this.polygonManager.hasEntity(state.id);
  }
  setOnClickListener(listener) {
    this.clickListener = listener;
  }
};

// src/groundimage/ArcGISGroundImageController.ts
import {
  GroundImageController,
  GroundImageManager
} from "@mapconductor/js-sdk-core";
var ArcGISGroundImageController = class extends GroundImageController {
  constructor(renderer) {
    super({
      groundImageManager: new GroundImageManager(),
      renderer
    });
  }
  async composition(data) {
    await this.add(data);
  }
  has(state) {
    return this.groundImageManager.hasEntity(state.id);
  }
  setOnClickListener(listener) {
    this.clickListener = listener;
  }
};

// src/raster/ArcGISRasterLayerController.ts
import {
  RasterLayerController,
  RasterLayerManager
} from "@mapconductor/js-sdk-core";
var ArcGISRasterLayerController = class extends RasterLayerController {
  constructor(renderer) {
    super({
      rasterLayerManager: new RasterLayerManager(),
      renderer
    });
  }
  async composition(data) {
    await this.add(data);
  }
  has(state) {
    return this.rasterLayerManager.hasEntity(state.id);
  }
};

// src/color.ts
var RGBA_RE = /^rgba\(\s*([+-]?\d*\.?\d+%?)\s*,\s*([+-]?\d*\.?\d+%?)\s*,\s*([+-]?\d*\.?\d+%?)\s*,\s*([+-]?\d*\.?\d+%?)\s*\)$/i;
var HEX_RGBA_RE = /^#([0-9a-f]{8})$/i;
var HEX_RGB_RE = /^#([0-9a-f]{6})$/i;
function clampOpacity(value) {
  if (Number.isNaN(value)) return 1;
  return Math.min(1, Math.max(0, value));
}
function alphaToOpacity(value) {
  if (value.endsWith("%")) {
    return clampOpacity(parseFloat(value) / 100);
  }
  return clampOpacity(parseFloat(value));
}
function toArcGISFillStyle(fillColor) {
  if (fillColor.trim().toLowerCase() === "transparent") {
    return { color: [0, 0, 0], opacity: 0 };
  }
  const rgba = RGBA_RE.exec(fillColor);
  if (rgba) {
    return {
      color: [
        parseFloat(rgba[1]),
        parseFloat(rgba[2]),
        parseFloat(rgba[3])
      ],
      opacity: alphaToOpacity(rgba[4])
    };
  }
  const hex = HEX_RGBA_RE.exec(fillColor);
  if (hex) {
    const value = hex[1];
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    const alpha = parseInt(value.slice(6, 8), 16) / 255;
    return {
      color: [r, g, b],
      opacity: clampOpacity(alpha)
    };
  }
  const hexRgb = HEX_RGB_RE.exec(fillColor);
  if (hexRgb) {
    const value = hexRgb[1];
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return {
      color: [r, g, b],
      opacity: 1
    };
  }
  return { color: [0, 0, 0], opacity: 1 };
}

// src/circle/ArcGISCircleOverlayRenderer.ts
import Graphic from "@arcgis/core/Graphic";
var ArcGISCircleOverlayRenderer = class {
  constructor(holder, graphicsLayer) {
    this.holder = holder;
    this.graphicsLayer = graphicsLayer;
  }
  createCircle(entity) {
    const state = entity.state;
    const position = state.center;
    const point = {
      type: "point",
      longitude: position.longitude,
      latitude: position.latitude,
      spatialReference: { wkid: 4326 }
    };
    const circleSymbol = this.createCircleSymbol(state);
    const graphic = new Graphic({
      geometry: point,
      symbol: circleSymbol,
      attributes: {
        id: state.id
      }
    });
    this.graphicsLayer.add(graphic);
    return graphic;
  }
  updateCircle(graphic, entity) {
    const state = entity.state;
    const position = state.center;
    graphic.geometry = {
      type: "point",
      longitude: position.longitude,
      latitude: position.latitude,
      spatialReference: { wkid: 4326 }
    };
    const circleSymbol = this.createCircleSymbol(state);
    graphic.symbol = circleSymbol;
  }
  removeCircle(graphic) {
    this.graphicsLayer.remove(graphic);
  }
  async onAdd(data) {
    return data.map(({ state }) => this.createCircle({ state }));
  }
  async onChange(data) {
    return data.map(({ current }) => {
      if (!current.circle) return this.createCircle(current);
      this.updateCircle(current.circle, current);
      return current.circle;
    });
  }
  async onRemove(data) {
    data.forEach(({ circle }) => {
      if (circle) this.removeCircle(circle);
    });
  }
  async onPostProcess() {
  }
  createCircleSymbol(state) {
    const strokeColor = state.strokeColor ?? "#000000";
    const strokeWidth = state.strokeWidth ?? 2;
    const fillColor = state.fillColor ?? "transparent";
    const fill = toArcGISFillStyle(fillColor);
    const stroke = toArcGISFillStyle(strokeColor);
    return {
      type: "simple-fill",
      style: "solid",
      color: [...fill.color, fill.opacity],
      outline: {
        type: "simple-line",
        style: "solid",
        color: [...stroke.color, stroke.opacity],
        width: strokeWidth
      }
    };
  }
};

// src/marker/ArcGISMarkerRenderer.ts
import Graphic2 from "@arcgis/core/Graphic";
var ArcGISMarkerRenderer = class {
  constructor(holder, graphicsLayer) {
    this.holder = holder;
    this.graphicsLayer = graphicsLayer;
    this.animateStartListener = null;
    this.animateEndListener = null;
    this.animationOverlayHost = null;
  }
  createMarker(entity) {
    const state = entity.state;
    const position = state.position;
    const point = {
      type: "point",
      longitude: position.longitude,
      latitude: position.latitude,
      spatialReference: { wkid: 4326 }
    };
    const markerSymbol = this.createMarkerSymbol(state);
    const graphic = new Graphic2({
      geometry: point,
      symbol: markerSymbol,
      attributes: {
        id: state.id
      }
    });
    this.graphicsLayer.add(graphic);
    return graphic;
  }
  updateMarker(graphic, entity) {
    const state = entity.state;
    const position = state.position;
    graphic.geometry = {
      type: "point",
      longitude: position.longitude,
      latitude: position.latitude,
      spatialReference: { wkid: 4326 }
    };
    const markerSymbol = this.createMarkerSymbol(state);
    graphic.symbol = markerSymbol;
  }
  removeMarker(graphic) {
    this.graphicsLayer.remove(graphic);
  }
  async onAdd(data) {
    return data.map(({ state }) => this.createMarker({ state }));
  }
  async onChange(data) {
    return data.map(({ current }) => {
      if (!current.marker) return this.createMarker(current);
      this.updateMarker(current.marker, current);
      return current.marker;
    });
  }
  async onRemove(data) {
    data.forEach(({ marker }) => {
      if (marker) this.removeMarker(marker);
    });
  }
  async onAnimate(_entity) {
  }
  async onPostProcess() {
  }
  setMarkerVisible(entity, visible) {
    if (entity.marker) entity.marker.visible = visible;
  }
  createMarkerSymbol(state) {
    const icon = state.icon?.toBitmapIcon();
    const iconUrl = icon?.url ?? "";
    const anchorU = icon?.anchor.x ?? 0.5;
    const anchorV = icon?.anchor.y ?? 1;
    const scale = state.icon?.scale ?? 1;
    const width = (icon?.size.width ?? 32) * scale;
    const height = (icon?.size.height ?? 32) * scale;
    return {
      type: "picture-marker",
      url: iconUrl,
      width,
      height,
      xoffset: -width / 2 * (2 * anchorU - 1),
      yoffset: -height * (1 - anchorV)
    };
  }
};

// src/polyline/ArcGISPolylineOverlayRenderer.ts
import Graphic3 from "@arcgis/core/Graphic";
var ArcGISPolylineOverlayRenderer = class {
  constructor(holder, graphicsLayer) {
    this.holder = holder;
    this.graphicsLayer = graphicsLayer;
  }
  createPolyline(entity) {
    const state = entity.state;
    const points = state.points;
    if (!points || points.length < 2) return null;
    const polyline = {
      type: "polyline",
      paths: [points.map((p) => [p.longitude, p.latitude])],
      spatialReference: { wkid: 4326 }
    };
    const lineSymbol = this.createLineSymbol(state);
    const graphic = new Graphic3({
      geometry: polyline,
      symbol: lineSymbol,
      attributes: {
        id: state.id
      }
    });
    this.graphicsLayer.add(graphic);
    return graphic;
  }
  updatePolyline(graphic, entity) {
    const state = entity.state;
    const points = state.points;
    if (!points || points.length < 2) return;
    graphic.geometry = {
      type: "polyline",
      paths: [points.map((p) => [p.longitude, p.latitude])],
      spatialReference: { wkid: 4326 }
    };
    const lineSymbol = this.createLineSymbol(state);
    graphic.symbol = lineSymbol;
  }
  removePolyline(graphic) {
    this.graphicsLayer.remove(graphic);
  }
  async onAdd(data) {
    return data.map(({ state }) => this.createPolyline({ state }));
  }
  async onChange(data) {
    return data.map(({ current }) => {
      if (!current.polyline) return this.createPolyline(current);
      this.updatePolyline(current.polyline, current);
      return current.polyline;
    });
  }
  async onRemove(data) {
    data.forEach(({ polyline }) => this.removePolyline(polyline));
  }
  async onPostProcess() {
  }
  createLineSymbol(state) {
    const width = state.strokeWidth;
    const pattern = "solid";
    const stroke = toArcGISFillStyle(state.strokeColor);
    return {
      type: "simple-line",
      style: this.lineStyleToArcGISStyle(pattern),
      color: [...stroke.color, stroke.opacity],
      width
    };
  }
  lineStyleToArcGISStyle(style) {
    switch (style.toLowerCase()) {
      case "dash":
        return "dash";
      case "dot":
        return "dot";
      case "dashdot":
        return "dash-dot";
      case "longdash":
        return "long-dash";
      case "longdashdot":
        return "long-dash-dot";
      case "null":
        return "none";
      default:
        return "solid";
    }
  }
};

// src/polygon/ArcGISPolygonOverlayRenderer.ts
import Graphic4 from "@arcgis/core/Graphic";
var ArcGISPolygonOverlayRenderer = class {
  constructor(holder, graphicsLayer) {
    this.holder = holder;
    this.graphicsLayer = graphicsLayer;
  }
  createPolygon(entity) {
    const state = entity.state;
    const points = state.points;
    if (!points || points.length < 3) return null;
    const polygon = {
      type: "polygon",
      rings: [points.map((p) => [p.longitude, p.latitude])],
      spatialReference: { wkid: 4326 }
    };
    const fillSymbol = this.createFillSymbol(state);
    const graphic = new Graphic4({
      geometry: polygon,
      symbol: fillSymbol,
      attributes: {
        id: state.id
      }
    });
    this.graphicsLayer.add(graphic);
    return graphic;
  }
  updatePolygon(graphic, entity) {
    const state = entity.state;
    const points = state.points;
    if (!points || points.length < 3) return;
    graphic.geometry = {
      type: "polygon",
      rings: [points.map((p) => [p.longitude, p.latitude])],
      spatialReference: { wkid: 4326 }
    };
    const fillSymbol = this.createFillSymbol(state);
    graphic.symbol = fillSymbol;
  }
  removePolygon(graphic) {
    this.graphicsLayer.remove(graphic);
  }
  async onAdd(data) {
    return data.map(({ state }) => this.createPolygon({ state }));
  }
  async onChange(data) {
    return data.map(({ current }) => {
      if (!current.polygon) return this.createPolygon(current);
      this.updatePolygon(current.polygon, current);
      return current.polygon;
    });
  }
  async onRemove(data) {
    data.forEach(({ polygon }) => this.removePolygon(polygon));
  }
  async onPostProcess() {
  }
  createFillSymbol(state) {
    const strokeColor = state.strokeColor ?? "#000000";
    const strokeWidth = state.strokeWidth ?? 2;
    const fillColor = state.fillColor ?? "transparent";
    const fill = toArcGISFillStyle(fillColor);
    const stroke = toArcGISFillStyle(strokeColor);
    return {
      type: "simple-fill",
      style: "solid",
      color: [...fill.color, fill.opacity],
      outline: {
        type: "simple-line",
        style: "solid",
        color: [...stroke.color, stroke.opacity],
        width: strokeWidth
      }
    };
  }
};

// src/groundimage/ArcGISGroundImageOverlayRenderer.ts
import Graphic5 from "@arcgis/core/Graphic";
var ArcGISGroundImageOverlayRenderer = class {
  constructor(holder, graphicsLayer) {
    this.holder = holder;
    this.graphicsLayer = graphicsLayer;
  }
  createGroundImage(entity) {
    const state = entity.state;
    const bounds = state.bounds;
    const imageUrl = state.imageUrl;
    if (!bounds || !bounds.southWest || !bounds.northEast || !imageUrl) return null;
    const southWest = bounds.southWest;
    const northEast = bounds.northEast;
    const polygon = {
      type: "polygon",
      rings: [[
        [southWest.longitude, southWest.latitude],
        [southWest.longitude, northEast.latitude],
        [northEast.longitude, northEast.latitude],
        [northEast.longitude, southWest.latitude],
        [southWest.longitude, southWest.latitude]
      ]],
      spatialReference: { wkid: 4326 }
    };
    const fillSymbol = {
      type: "picture-fill",
      url: imageUrl,
      width: northEast.longitude - southWest.longitude,
      height: northEast.latitude - southWest.latitude,
      outline: {
        type: "simple-line",
        style: "solid",
        color: [0, 0, 0, 0],
        width: 0
      }
    };
    const graphic = new Graphic5({
      geometry: polygon,
      symbol: fillSymbol,
      attributes: {
        id: state.id
      }
    });
    this.graphicsLayer.add(graphic);
    return graphic;
  }
  updateGroundImage(graphic, entity) {
    const state = entity.state;
    const bounds = state.bounds;
    const imageUrl = state.imageUrl;
    if (!bounds || !bounds.southWest || !bounds.northEast || !imageUrl) return;
    const southWest = bounds.southWest;
    const northEast = bounds.northEast;
    graphic.geometry = {
      type: "polygon",
      rings: [[
        [southWest.longitude, southWest.latitude],
        [southWest.longitude, northEast.latitude],
        [northEast.longitude, northEast.latitude],
        [northEast.longitude, southWest.latitude],
        [southWest.longitude, southWest.latitude]
      ]],
      spatialReference: { wkid: 4326 }
    };
    graphic.symbol.url = imageUrl;
  }
  removeGroundImage(graphic) {
    this.graphicsLayer.remove(graphic);
  }
  async onAdd(data) {
    return data.map(({ state }) => this.createGroundImage({ state }));
  }
  async onChange(data) {
    return data.map(({ current }) => {
      if (!current.groundImage) return this.createGroundImage(current);
      this.updateGroundImage(current.groundImage, current);
      return current.groundImage;
    });
  }
  async onRemove(data) {
    data.forEach(({ groundImage }) => this.removeGroundImage(groundImage));
  }
  async onPostProcess() {
  }
};

// src/raster/ArcGISRasterLayerOverlayRenderer.ts
import WebTileLayer from "@arcgis/core/layers/WebTileLayer";
var ArcGISRasterLayerOverlayRenderer = class {
  constructor(holder) {
    this.holder = holder;
  }
  async createRasterLayer(entity) {
    const state = entity.state;
    const source = state.source;
    const urlTemplate = source.type === "UrlTemplate" ? source.template : source.type === "ArcGisService" ? `${source.serviceUrl.replace(/\/+$/, "")}/tile/{z}/{y}/{x}` : source.url;
    try {
      const rasterLayer = new WebTileLayer({
        urlTemplate
      });
      this.holder.map.map?.add(rasterLayer);
      return rasterLayer;
    } catch (e) {
      console.error("Failed to create raster layer:", e);
      return null;
    }
  }
  async updateRasterLayer(layer, entity) {
    const state = entity.state;
    const source = state.source;
    const urlTemplate = source.type === "UrlTemplate" ? source.template : source.type === "ArcGisService" ? `${source.serviceUrl.replace(/\/+$/, "")}/tile/{z}/{y}/{x}` : source.url;
    layer.urlTemplate = urlTemplate;
  }
  async removeRasterLayer(layer) {
    this.holder.map.map?.remove(layer);
  }
  async onAdd(data) {
    return Promise.all(data.map(({ state }) => state.visible ? this.createRasterLayer({ state }) : null));
  }
  async onChange(data) {
    return Promise.all(data.map(async ({ current, prev }) => {
      await this.removeRasterLayer(prev.layer);
      return current.state.visible ? this.createRasterLayer(current) : null;
    }));
  }
  async onRemove(data) {
    await Promise.all(data.map(({ layer }) => this.removeRasterLayer(layer)));
  }
  async onCameraChanged(_mapCameraPosition) {
  }
  async onPostProcess() {
  }
};

// src/zoom/ZoomAltitudeConverter.ts
import { AbstractZoomAltitudeConverter } from "@mapconductor/js-sdk-core";
var degToRad = (deg) => deg * Math.PI / 180;
var _ZoomAltitudeConverter = class _ZoomAltitudeConverter extends AbstractZoomAltitudeConverter {
  constructor(zoom0Altitude = _ZoomAltitudeConverter.ARCGIS_OPTIMIZED_ZOOM0_ALTITUDE, viewportSizeProvider = null) {
    super(zoom0Altitude);
    this.viewportSizeProvider = viewportSizeProvider;
  }
  effectiveZoom0Altitude() {
    const height = this.viewportSizeProvider?.()?.height;
    const viewportScale = height == null || !Number.isFinite(height) || height <= 0 ? 1 : height / _ZoomAltitudeConverter.REFERENCE_VIEWPORT_HEIGHT_PX;
    return this.zoom0Altitude * _ZoomAltitudeConverter.SCENE_VIEW_FIELD_OF_VIEW_SCALE * viewportScale;
  }
  cosLatitudeFactor(latitude) {
    const clamped = Math.max(-85, Math.min(85, latitude));
    const latRad = clamped * Math.PI / 180;
    return Math.max(AbstractZoomAltitudeConverter.MIN_COS_LAT, Math.abs(Math.cos(latRad)));
  }
  cosTiltFactor(tilt) {
    const clamped = Math.max(0, Math.min(90, tilt));
    const tiltRad = clamped * Math.PI / 180;
    return Math.max(AbstractZoomAltitudeConverter.MIN_COS_TILT, Math.cos(tiltRad));
  }
  zoomLevelToAltitude({
    zoomLevel,
    latitude,
    tilt
  }) {
    const distance = this.zoomLevelToDistance({ zoomLevel, latitude });
    const cosTilt = this.cosTiltFactor(tilt);
    const altitude = distance * cosTilt;
    return Math.min(Math.max(altitude, AbstractZoomAltitudeConverter.MIN_ALTITUDE), AbstractZoomAltitudeConverter.MAX_ALTITUDE);
  }
  altitudeToZoomLevel({
    altitude,
    latitude,
    tilt
  }) {
    const clampedAltitude = Math.min(Math.max(altitude, AbstractZoomAltitudeConverter.MIN_ALTITUDE), AbstractZoomAltitudeConverter.MAX_ALTITUDE);
    const cosTilt = this.cosTiltFactor(tilt);
    return this.distanceToZoomLevel({ distance: clampedAltitude / cosTilt, latitude });
  }
  zoomLevelToDistance({
    zoomLevel,
    latitude
  }) {
    const clampedZoom = Math.min(Math.max(zoomLevel, AbstractZoomAltitudeConverter.MIN_ZOOM_LEVEL), AbstractZoomAltitudeConverter.MAX_ZOOM_LEVEL);
    const cosLat = this.cosLatitudeFactor(latitude);
    const distance = this.effectiveZoom0Altitude() * cosLat / Math.pow(AbstractZoomAltitudeConverter.ZOOM_FACTOR, clampedZoom);
    return Math.min(Math.max(distance, AbstractZoomAltitudeConverter.MIN_ALTITUDE), AbstractZoomAltitudeConverter.MAX_ALTITUDE);
  }
  distanceToZoomLevel({
    distance,
    latitude
  }) {
    const clampedDistance = Math.min(Math.max(distance, AbstractZoomAltitudeConverter.MIN_ALTITUDE), AbstractZoomAltitudeConverter.MAX_ALTITUDE);
    const cosLat = this.cosLatitudeFactor(latitude);
    const zoomLevel = Math.log2(this.effectiveZoom0Altitude() * cosLat / clampedDistance);
    return Math.min(Math.max(zoomLevel, AbstractZoomAltitudeConverter.MIN_ZOOM_LEVEL), AbstractZoomAltitudeConverter.MAX_ZOOM_LEVEL);
  }
  mapCameraPositionToCameraOptions(cameraPosition) {
    if (!cameraPosition) {
      return null;
    }
    const { position, zoom, bearing, tilt } = cameraPosition;
    const distance = this.zoomLevelToDistance({ zoomLevel: zoom, latitude: position.latitude });
    const altitude = distance * Math.cos(degToRad(tilt));
    return {
      position: {
        x: position.longitude,
        y: position.latitude,
        z: altitude
      },
      heading: bearing,
      tilt
    };
  }
};
_ZoomAltitudeConverter.ARCGIS_OPTIMIZED_ZOOM0_ALTITUDE = 1365e5;
_ZoomAltitudeConverter.REFERENCE_VIEWPORT_HEIGHT_PX = 720;
// ArcGIS Maps SDK for JavaScript's SceneView has a slightly wider field of
// view than the native ArcGIS view. Preserve Android's shared zoom base and
// compensate only for the Web SceneView projection.
_ZoomAltitudeConverter.SCENE_VIEW_FIELD_OF_VIEW_SCALE = 1.08;
var ZoomAltitudeConverter = _ZoomAltitudeConverter;

// src/ArcGISMapProvider.ts
var ArcGISMapProvider = class extends MapProvider {
  constructor() {
    super(...arguments);
    this.resizeObserver = null;
  }
  async initialize(config) {
    const [mapModule, graphicsLayerModule, basemapModule, sceneViewModule, mapViewModule, configModule, elevationLayerModule] = await Promise.all([
      import("@arcgis/core/Map"),
      import("@arcgis/core/layers/GraphicsLayer"),
      import("@arcgis/core/Basemap"),
      import("@arcgis/core/views/SceneView"),
      import("@arcgis/core/views/MapView"),
      import("@arcgis/core/config"),
      import("@arcgis/core/layers/ElevationLayer")
    ]);
    const Map2 = mapModule.default;
    const GL = graphicsLayerModule.default;
    const BM = basemapModule.default;
    const SV = sceneViewModule.default;
    const MV = mapViewModule.default;
    const ElevationLayer = elevationLayerModule.default;
    if (config.apiKey) configModule.default.apiKey = config.apiKey;
    if (this.controller) {
      return this.controller;
    }
    const container = typeof config.container === "string" ? document.getElementById(config.container) : config.container;
    if (!container) {
      throw new Error("Container element not found");
    }
    const viewportSize = () => {
      const rect = container.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    };
    const zoomConverter = new ZoomAltitudeConverter(
      ZoomAltitudeConverter.ARCGIS_OPTIMIZED_ZOOM0_ALTITUDE,
      viewportSize
    );
    const design = config.mapDesignType ?? ArcGISDesign.Streets;
    const basemap = this.createBasemap(design, BM);
    const useSceneView = config.useSceneView !== false;
    const map = new Map2({
      basemap,
      ground: useSceneView && design.elevationSources.length > 0 ? { layers: design.elevationSources.map((url) => new ElevationLayer({ url })) } : void 0
    });
    const view = useSceneView ? new SV({
      container,
      map,
      camera: config.initCameraPosition ? zoomConverter.mapCameraPositionToCameraOptions(config.initCameraPosition) ?? void 0 : void 0,
      qualityProfile: "high",
      environment: {
        lighting: {
          type: "virtual",
          directShadowsEnabled: false
        }
      }
    }) : new MV({
      container,
      map,
      center: config.initCameraPosition ? [config.initCameraPosition.position.longitude, config.initCameraPosition.position.latitude] : void 0,
      scale: config.initCameraPosition ? arcGISZoomToScale(
        config.initCameraPosition.zoom,
        config.initCameraPosition.position.latitude
      ) : void 0,
      rotation: config.initCameraPosition?.bearing
    });
    Object.assign(container.style, { width: "100%", height: "100%", display: "block" });
    const markerGraphicsLayer = new GL({ id: "marker-layer" });
    const circleGraphicsLayer = new GL({ id: "circle-layer" });
    const polylineGraphicsLayer = new GL({ id: "polyline-layer" });
    const polygonGraphicsLayer = new GL({ id: "polygon-layer" });
    const groundImageGraphicsLayer = new GL({ id: "ground-image-layer" });
    map.addMany([
      groundImageGraphicsLayer,
      polygonGraphicsLayer,
      polylineGraphicsLayer,
      circleGraphicsLayer,
      markerGraphicsLayer
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
      design
    );
    this.controller = controller;
    let previousWidth = viewportSize().width;
    let previousHeight = viewportSize().height;
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        const nextSize = viewportSize();
        const { width: nextWidth, height: nextHeight } = nextSize;
        if (nextHeight <= 0 || nextWidth === previousWidth && nextHeight === previousHeight) return;
        if (nextHeight !== previousHeight) {
          const sceneView = view.type === "3d" ? view : null;
          const camera = sceneView?.camera;
          if (camera) {
            const previousEffectiveHeight = previousHeight > 0 ? previousHeight : ZoomAltitudeConverter.REFERENCE_VIEWPORT_HEIGHT_PX;
            const ratio = nextHeight / previousEffectiveHeight;
            sceneView.camera = {
              ...camera,
              position: {
                ...camera.position,
                z: (camera.position.z ?? 0) * ratio
              }
            };
          }
        }
        previousWidth = nextWidth;
        previousHeight = nextHeight;
        controller.notifyViewportResized();
      });
      this.resizeObserver.observe(container);
    }
    return controller;
  }
  destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.controller) {
      this.controller.destroy();
      this.controller = null;
    }
  }
  createBasemap(designType, BasemapConstructor) {
    return new BasemapConstructor({
      style: { id: ArcGISDesign.toBasemapStyle(designType) }
    });
  }
};
function getRasterLayerController(holder) {
  const renderer = new ArcGISRasterLayerOverlayRenderer(holder);
  return new ArcGISRasterLayerController(renderer);
}
function getMarkerController(holder, markerLayer, config) {
  const markerRenderer = new ArcGISMarkerRenderer(holder, markerLayer);
  return new ArcGISMarkerController(markerRenderer, config.markerTilingOptions);
}
function getCircleController(holder, circleLayer) {
  const renderer = new ArcGISCircleOverlayRenderer(holder, circleLayer);
  return new ArcGISCircleOverlayController(renderer);
}
function getPolylineController(holder, polylineLayer) {
  const renderer = new ArcGISPolylineOverlayRenderer(holder, polylineLayer);
  return new ArcGISPolylineOverlayController(renderer);
}
function getPolygonController(holder, polygonLayer) {
  const renderer = new ArcGISPolygonOverlayRenderer(holder, polygonLayer);
  return new ArcGISPolygonOverlayController(renderer);
}
function getGroundImageController(holder, groundImageLayer) {
  const renderer = new ArcGISGroundImageOverlayRenderer(holder, groundImageLayer);
  return new ArcGISGroundImageController(renderer);
}

// src/ArcGISMapView.web.tsx
import { useEffect, useRef, useState } from "react";
import "@arcgis/core/assets/esri/themes/light/main.css";
import {
  MapContext,
  MapViewScope,
  MapViewScopeProvider,
  InfoBubbleOverlay,
  MarkerAnimationLayer,
  MapAttributionOverlay
} from "@mapconductor/js-sdk-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var MISSING_API_KEY_MESSAGE = "ArcGIS API key is required. Set arcGISMapViewState.apiKey via useArcGISViewState({ apiKey }).";
var ARCGIS_VIEW_ROOT_STYLE_ID = "mapconductor-arcgis-view-root-style";
function ensureArcGISViewRootStyle() {
  if (typeof document === "undefined" || document.getElementById(ARCGIS_VIEW_ROOT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = ARCGIS_VIEW_ROOT_STYLE_ID;
  style.textContent = `
.esri-view .esri-view-root {
  flex: unset;
  height: 100%;
}
`;
  document.head.appendChild(style);
}
function ArcGISMapView({
  state,
  className,
  style,
  markerTilingOptions,
  onError,
  onMapLoaded,
  onMapClick,
  onMapLongClick,
  onCameraMoveStart,
  onCameraMove,
  onCameraMoveEnd,
  children,
  useSceneView = true
}) {
  const containerRef = useRef(null);
  const [provider] = useState(() => new ArcGISMapProvider());
  const [scope] = useState(() => new MapViewScope());
  const [controller, setController] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const bridgeUnsubs = useRef([]);
  const typedControllerRef = useRef(null);
  const [bubbleEntries, setBubbleEntries] = useState([]);
  const [animationEntries, setAnimationEntries] = useState([]);
  const [cameraTick, setCameraTick] = useState(0);
  const [initializationError, setInitializationError] = useState(null);
  const missingApiKey = !state.apiKey?.trim();
  const onMapLoadedRef = useRef(onMapLoaded);
  const onMapClickRef = useRef(onMapClick);
  const onMapLongClickRef = useRef(onMapLongClick);
  const onCameraMoveStartRef = useRef(onCameraMoveStart);
  const onCameraMoveRef = useRef(onCameraMove);
  const onCameraMoveEndRef = useRef(onCameraMoveEnd);
  const onErrorRef = useRef(onError);
  onMapLoadedRef.current = onMapLoaded;
  onMapClickRef.current = onMapClick;
  onMapLongClickRef.current = onMapLongClick;
  onCameraMoveStartRef.current = onCameraMoveStart;
  onCameraMoveRef.current = onCameraMove;
  onCameraMoveEndRef.current = onCameraMoveEnd;
  onErrorRef.current = onError;
  useEffect(() => {
    ensureArcGISViewRootStyle();
    if (!containerRef.current) return;
    const resolvedApiKey = state.apiKey?.trim();
    if (!resolvedApiKey) {
      const error = new Error(MISSING_API_KEY_MESSAGE);
      setInitializationError(error);
      onErrorRef.current?.(error);
      return;
    }
    let cancelled = false;
    setInitializationError(null);
    const config = {
      container: containerRef.current,
      initCameraPosition: state.cameraPosition,
      mapDesignType: state.mapDesignType,
      markerTilingOptions,
      apiKey: resolvedApiKey,
      useSceneView
    };
    provider.initialize(config).then((ctrl) => {
      if (cancelled) return;
      state.setController(ctrl);
      state.setCameraPositionChangeListener(() => {
        setCameraTick((t) => t + 1);
      });
      setController(ctrl);
      typedControllerRef.current = ctrl;
      ctrl.setCameraMoveStartListener((camera) => {
        state.updateCameraPosition(camera);
        onCameraMoveStartRef.current?.(camera);
      });
      ctrl.setCameraMoveListener((camera) => {
        state.updateCameraPosition(camera);
        onCameraMoveRef.current?.(camera);
        setCameraTick((t) => t + 1);
      });
      ctrl.setCameraMoveEndListener((camera) => {
        state.updateCameraPosition(camera);
        onCameraMoveEndRef.current?.(camera);
        setCameraTick((t) => t + 1);
      });
      ctrl.setMapClickListener((point) => onMapClickRef.current?.(point));
      ctrl.setMapLongClickListener((point) => onMapLongClickRef.current?.(point));
      ctrl.setMapInitializedListener(() => {
        onMapLoadedRef.current?.(state);
        setCameraTick((t) => t + 1);
      });
      const registry = scope.buildRegistry();
      for (const overlay of registry.getAll()) {
        const unsub = overlay.subscribe((data) => {
          overlay.render(data, ctrl).catch(console.error);
        });
        bridgeUnsubs.current.push(unsub);
      }
      const bubbleUnsub = scope.bubbleCollector.subscribe((map) => {
        setBubbleEntries(Array.from(map.values()));
      });
      bridgeUnsubs.current.push(bubbleUnsub);
      typedControllerRef.current.setMarkerAnimationOverlayHost(scope.markerAnimationStore.start);
      bridgeUnsubs.current.push(() => typedControllerRef.current?.setMarkerAnimationOverlayHost(null));
      const animationUnsub = scope.markerAnimationStore.subscribe(setAnimationEntries);
      bridgeUnsubs.current.push(animationUnsub);
      const c = ctrl;
      const setupUpdateHandler = (collector, hasMethod, updateMethod, onUpdated) => {
        collector.setUpdateHandler((state2) => {
          if (c[hasMethod]?.(state2)) {
            void c[updateMethod]?.(state2);
            onUpdated?.();
          }
        });
        bridgeUnsubs.current.push(() => collector.setUpdateHandler(null));
      };
      setupUpdateHandler(scope.markerCollector, "hasMarker", "updateMarker", () => setCameraTick((t) => t + 1));
      setupUpdateHandler(scope.circleCollector, "hasCircle", "updateCircle");
      setupUpdateHandler(scope.polylineCollector, "hasPolyline", "updatePolyline");
      setupUpdateHandler(scope.polygonCollector, "hasPolygon", "updatePolygon");
      setupUpdateHandler(scope.groundImageCollector, "hasGroundImage", "updateGroundImage");
      setupUpdateHandler(scope.rasterLayerCollector, "hasRasterLayer", "updateRasterLayer");
      setIsReady(true);
    }).catch((error) => {
      if (cancelled) return;
      console.error("Failed to initialize ArcGIS:", error);
      const initializationError2 = error instanceof Error ? error : new Error(String(error));
      setInitializationError(initializationError2);
      onErrorRef.current?.(initializationError2);
    });
    return () => {
      cancelled = true;
      state.setCameraPositionChangeListener(null);
      state.setController(null);
      typedControllerRef.current = null;
      bridgeUnsubs.current.forEach((unsub) => unsub());
      bridgeUnsubs.current = [];
      provider.destroy();
    };
  }, [state.apiKey, state.mapDesignType.id, useSceneView]);
  void cameraTick;
  return /* @__PURE__ */ jsxs(MapContext.Provider, { value: { controller, isReady }, children: [
    /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          ref: containerRef,
          className,
          style: {
            width: "100%",
            height: "100%",
            ...style
          }
        }
      ),
      (missingApiKey || initializationError) && /* @__PURE__ */ jsx(
        "div",
        {
          role: "alert",
          style: {
            position: "absolute",
            inset: 0,
            zIndex: 1e3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            boxSizing: "border-box",
            background: "#fff",
            color: "#b91c1c",
            fontFamily: "sans-serif",
            textAlign: "center"
          },
          children: missingApiKey ? MISSING_API_KEY_MESSAGE : initializationError?.message
        }
      ),
      /* @__PURE__ */ jsx(
        MapAttributionOverlay,
        {
          scope,
          camera: typedControllerRef.current?.getCameraPosition() ?? state.cameraPosition,
          designAttributionRules: state.mapDesignType.attributionRules
        }
      ),
      animationEntries.length > 0 && typedControllerRef.current && /* @__PURE__ */ jsx(
        MarkerAnimationLayer,
        {
          entries: animationEntries,
          resolveScreenOffset: (entry) => typedControllerRef.current.holder.toScreenOffset(entry.state.position)
        }
      ),
      bubbleEntries.length > 0 && typedControllerRef.current && /* @__PURE__ */ jsx("div", { style: { position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }, children: bubbleEntries.map((entry) => {
        const holder = typedControllerRef.current.holder;
        const pos = entry.positionProvider();
        const screenOffset = holder.toScreenOffset(pos);
        if (!screenOffset) return null;
        const icon = entry.icon;
        const iconPixelSize = icon ? icon.iconSize * icon.scale : 0;
        return /* @__PURE__ */ jsx(
          InfoBubbleOverlay,
          {
            positionOffset: screenOffset,
            iconSize: { width: iconPixelSize, height: iconPixelSize },
            iconOffset: icon ? icon.anchor : { x: 0.5, y: 0.5 },
            infoAnchorOffset: icon ? icon.infoAnchor : { x: 0.5, y: 0.5 },
            tailOffset: entry.tailOffset,
            style: { pointerEvents: "auto" },
            children: entry.content
          },
          entry.id
        );
      }) })
    ] }),
    /* @__PURE__ */ jsx(MapViewScopeProvider, { scope, children })
  ] });
}
function ArcGISMapView2D(props) {
  return /* @__PURE__ */ jsx(ArcGISMapView, { ...props, useSceneView: false });
}

// src/ArcGISMapViewState.ts
import { useState as useState2 } from "react";
import {
  MapCameraPosition as MapCameraPositionNS,
  MapViewState,
  createRandomId
} from "@mapconductor/js-sdk-core";
var ArcGISMapViewState = class extends MapViewState {
  constructor({
    id = createRandomId(),
    apiKey = "",
    mapDesignType = ArcGISDesign.Streets,
    cameraPosition = MapCameraPositionNS.Default
  } = {}) {
    super();
    this.controller = null;
    this.cameraPositionChangeListener = null;
    this.id = id;
    this.apiKey = apiKey;
    this._mapDesignType = mapDesignType;
    this._cameraPosition = cameraPosition;
  }
  get cameraPosition() {
    return this._cameraPosition;
  }
  get mapDesignType() {
    return this._mapDesignType;
  }
  set mapDesignType(value) {
    this._mapDesignType = value;
    const controller = this.controller;
    controller?.setMapDesignType?.(value);
  }
  moveCameraTo(positionOrCamera, durationMillis) {
    const next = "zoom" in positionOrCamera ? positionOrCamera : this._cameraPosition.copy({ position: positionOrCamera });
    if (!this.controller) {
      this._cameraPosition = next;
      return;
    }
    if (!durationMillis || durationMillis === 0) {
      void this.controller.moveCamera(next);
    } else {
      void this.controller.animateCamera(next, { duration: durationMillis });
    }
    this._cameraPosition = next;
    this.cameraPositionChangeListener?.(next);
  }
  getMapViewHolder() {
    return this.controller?.holder ?? null;
  }
  setController(controller) {
    this.controller = controller;
  }
  updateCameraPosition(camera) {
    this._cameraPosition = camera;
    this.cameraPositionChangeListener?.(camera);
  }
  setCameraPositionChangeListener(listener) {
    this.cameraPositionChangeListener = listener;
  }
};
function useArcGISViewState(params = {}) {
  const [state] = useState2(() => new ArcGISMapViewState(params));
  return state;
}
export {
  ArcGISDesign,
  ArcGISMapProvider,
  ArcGISMapView,
  ArcGISMapView2D,
  ArcGISMapViewController,
  ArcGISMapViewState,
  ZoomAltitudeConverter,
  arcGISScaleToZoom,
  arcGISZoomToScale,
  useArcGISViewState
};
