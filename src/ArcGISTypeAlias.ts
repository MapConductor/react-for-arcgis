import type Layer from "@arcgis/core/layers/Layer";
import type ImageElement from "@arcgis/core/layers/support/ImageElement";
import type Graphic from "@arcgis/core/Graphic";
import type MapView from "@arcgis/core/views/MapView";
import type SceneView from "@arcgis/core/views/SceneView";

export type ArcGISActualMarker = Graphic;
export type ArcGISActualMap = SceneView | MapView;
export type ArcGISActualCircle = Graphic;
export type ArcGISActualPolyline = Graphic;
export type ArcGISActualPolygon = Graphic;
export type ArcGISActualGroundImage = ImageElement;
export type ArcGISActualRasterLayer = Layer;
