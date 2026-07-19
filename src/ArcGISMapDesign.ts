import type { AttributionRule, MapDesignTypeInterface } from '@mapconductor/js-sdk-core';

export interface ArcGISDesignTypeInterface extends MapDesignTypeInterface<string> {
  readonly elevationSources: readonly string[];
}

export type ArcGISDesignType = ArcGISDesignTypeInterface;

export class ArcGISDesign implements ArcGISDesignTypeInterface {
  constructor(
    readonly id: string,
    readonly elevationSources: readonly string[] = [],
    readonly attributionRules: readonly AttributionRule[] = [],
  ) {}

  getValue(): string {
    return this.id;
  }

  withElevationSources(sources: readonly string[]): ArcGISDesign {
    return new ArcGISDesign(this.id, sources, this.attributionRules);
  }

  static readonly Streets = new ArcGISDesign('arc_gis_streets');
  static readonly Imagery = new ArcGISDesign('arc_gis_imagery');
  static readonly ImageryStandard = new ArcGISDesign('arc_gis_imagery_standard');
  static readonly ImageryLabels = new ArcGISDesign('arc_gis_imagery_labels');
  static readonly LightGray = new ArcGISDesign('arc_gis_light_gray');
  static readonly LightGrayBase = new ArcGISDesign('arc_gis_light_gray_base');
  static readonly LightGrayLabels = new ArcGISDesign('arc_gis_light_gray_labels');
  static readonly DarkGray = new ArcGISDesign('arc_gis_dark_gray');
  static readonly DarkGrayBase = new ArcGISDesign('arc_gis_dark_gray_base');
  static readonly DarkGrayLabels = new ArcGISDesign('arc_gis_dark_gray_labels');
  static readonly Navigation = new ArcGISDesign('arc_gis_navigation');
  static readonly NavigationNight = new ArcGISDesign('arc_gis_navigation_night');
  static readonly StreetsNight = new ArcGISDesign('arc_gis_streets_night');
  static readonly StreetsRelief = new ArcGISDesign('arc_gis_streets_relief');
  static readonly Topographic = new ArcGISDesign('arc_gis_topographic');
  static readonly Oceans = new ArcGISDesign('arc_gis_oceans');
  static readonly OceansBase = new ArcGISDesign('arc_gis_oceans_base');
  static readonly OceansLabels = new ArcGISDesign('arc_gis_oceans_labels');
  static readonly Terrain = new ArcGISDesign('arc_gis_terrain');
  static readonly TerrainBase = new ArcGISDesign('arc_gis_terrain_base');
  static readonly TerrainDetail = new ArcGISDesign('arc_gis_terrain_detail');
  static readonly Community = new ArcGISDesign('arc_gis_community');
  static readonly ChartedTerritory = new ArcGISDesign('arc_gis_charted_territory');
  static readonly ColoredPencil = new ArcGISDesign('arc_gis_colored_pencil');
  static readonly Nova = new ArcGISDesign('arc_gis_nova');
  static readonly ModernAntique = new ArcGISDesign('arc_gis_modern_antique');
  static readonly Midcentury = new ArcGISDesign('arc_gis_midcentury');
  static readonly Newspaper = new ArcGISDesign('arc_gis_newspaper');
  static readonly HillshadeLight = new ArcGISDesign('arc_gis_hillshade_light');
  static readonly HillshadeDark = new ArcGISDesign('arc_gis_hillshade_dark');
  static readonly StreetsReliefBase = new ArcGISDesign('arc_gis_streets_relief_base');
  static readonly TopographicBase = new ArcGISDesign('arc_gis_topographic_base');
  static readonly ChartedTerritoryBase = new ArcGISDesign('arc_gis_charted_territory_base');
  static readonly ModernAntiqueBase = new ArcGISDesign('arc_gis_modern_antique_base');
  static readonly HumanGeography = new ArcGISDesign('arc_gis_human_geography');
  static readonly HumanGeographyBase = new ArcGISDesign('arc_gis_human_geography_base');
  static readonly HumanGeographyDetail = new ArcGISDesign('arc_gis_human_geography_detail');
  static readonly HumanGeographyLabels = new ArcGISDesign('arc_gis_human_geography_labels');
  static readonly HumanGeographyDark = new ArcGISDesign('arc_gis_human_geography_dark');
  static readonly HumanGeographyDarkBase = new ArcGISDesign('arc_gis_human_geography_dark_base');
  static readonly HumanGeographyDarkDetail = new ArcGISDesign('arc_gis_human_geography_dark_detail');
  static readonly HumanGeographyDarkLabels = new ArcGISDesign('arc_gis_human_geography_dark_labels');
  static readonly Outdoor = new ArcGISDesign('arc_gis_outdoor');
  static readonly OsmStandard = new ArcGISDesign('osm_standard');
  static readonly OsmStandardRelief = new ArcGISDesign('osm_standard_relief');
  static readonly OsmStandardReliefBase = new ArcGISDesign('osm_standard_relief_base');
  static readonly OsmStreets = new ArcGISDesign('osm_streets');
  static readonly OsmStreetsRelief = new ArcGISDesign('osm_streets_relief');
  static readonly OsmLightGray = new ArcGISDesign('osm_light_gray');
  static readonly OsmLightGrayBase = new ArcGISDesign('osm_light_gray_base');
  static readonly OsmLightGrayLabels = new ArcGISDesign('osm_light_gray_labels');
  static readonly OsmDarkGray = new ArcGISDesign('osm_dark_gray');
  static readonly OsmDarkGrayBase = new ArcGISDesign('osm_dark_gray_base');
  static readonly OsmDarkGrayLabels = new ArcGISDesign('osm_dark_gray_labels');
  static readonly OsmStreetsReliefBase = new ArcGISDesign('osm_streets_relief_base');
  static readonly OsmBlueprint = new ArcGISDesign('osm_blueprint');
  static readonly OsmHybrid = new ArcGISDesign('osm_hybrid');
  static readonly OsmHybridDetail = new ArcGISDesign('osm_hybrid_detail');
  static readonly OsmNavigation = new ArcGISDesign('osm_navigation');
  static readonly OsmNavigationDark = new ArcGISDesign('osm_navigation_dark');

  private static readonly designs = new Map<string, ArcGISDesign>(
    Object.values(ArcGISDesign)
      .filter((value): value is ArcGISDesign => value instanceof ArcGISDesign)
      .map(value => [value.id, value]),
  );

  static Create(id: string, sources: readonly string[] = []): ArcGISDesign {
    const design = ArcGISDesign.designs.get(id);
    if (!design) throw new Error(`unknown design id: "${id}"`);
    return sources.length === 0 ? design : design.withElevationSources(sources);
  }

  static toBasemapStyle(designType: ArcGISDesignTypeInterface): string {
    const id = ArcGISDesign.Create(designType.getValue()).id;
    const prefix = id.startsWith('arc_gis_') ? 'arcgis/' : 'osm/';
    const value = id
      .replace(/^arc_gis_|^osm_/, '')
      .replace(/_(standard|labels|base|detail|night|dark)$/, '/$1')
      .replace(/_/g, '-');
    return `${prefix}${value}`;
  }
}
