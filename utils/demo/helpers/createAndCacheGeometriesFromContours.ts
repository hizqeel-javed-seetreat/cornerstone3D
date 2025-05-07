import { geometryLoader, Enums } from '@cornerstonejs/core';
import assetsURL from '../../assets/assetsURL.json';
import jsonSets from '../../assets/jsonSets.json';

/**
 * Creates and caches geometries from contours
 * @param contours - The contours data
 * @returns A Map of segment index to geometry ID
 */

export async function createAndCacheGeometriesFromContours(
  name: string
): Promise<string[]> {
  const data = jsonSets as any;

  const geometryIds: string[] = [];
  jsonSets[name].contourSets.forEach((contourSet) => {
    const geometryId = String(contourSet.id);
    geometryIds.push(geometryId);
    return geometryLoader.createAndCacheGeometry(geometryId, {
      type: Enums.GeometryType.CONTOUR,
      geometryData: contourSet as any,
    });
  });

  return geometryIds;
}
