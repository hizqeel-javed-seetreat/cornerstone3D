import type { Types } from '@cornerstonejs/core';
import {
  RenderingEngine,
  Enums,
  imageLoader,
  eventTarget,
  volumeLoader,
  setVolumesForViewports,
} from '@cornerstonejs/core';
import * as cornerstone3D from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import {
  cornerstoneNiftiImageLoader,
  createNiftiImageIdsAndCacheMetadata,
  Enums as NiftiEnums,
} from '@cornerstonejs/nifti-volume-loader';
import {
  addSliderToToolbar,
  addToggleButtonToToolbar,
  createAndCacheGeometriesFromContours,
  initDemo,
  setTitleAndDescription,
} from '../../../../utils/demo/helpers';

const {
  ToolGroupManager,
  Enums: csToolsEnums,
  segmentation,
  ZoomTool,
  PanTool,
  StackScrollTool,
  TrackballRotateTool,
} = cornerstoneTools;
const { MouseBindings } = csToolsEnums;
const { ViewportType, OrientationAxis } = Enums;

const niftiURL = 'http://localhost:3001/contour';
const volumeLoaderScheme = 'cornerstoneStreamingImageVolume';
const volumeId = `${volumeLoaderScheme}:${niftiURL}`;
const segmentationId = 'MY_SEGMENTATION_ID';
const toolGroupId = 'MY_TOOLGROUP_ID';

const VP_ID = {
  AXIAL: 'CT_AXIAL',
  CORONAL: 'CT_CORONAL',
  SAGITTAL: 'CT_SAGITTAL',
};

setTitleAndDescription(
  'NIfTI Segmentation Viewer',
  'Display multiple planes with contour segmentation over NIfTI volume.'
);

const size = '500px';
const content = document.getElementById('content')!;
const viewportGrid = document.createElement('div');
viewportGrid.style.display = 'flex';
viewportGrid.style.flexDirection = 'row';
viewportGrid.style.gap = '4px';

function makeViewportElement() {
  const el = document.createElement('div');
  el.oncontextmenu = () => false;
  el.style.width = size;
  el.style.height = size;
  return el;
}

const elementAxial = makeViewportElement();
const elementCoronal = makeViewportElement();
const elementSagittal = makeViewportElement();

viewportGrid.append(elementAxial, elementCoronal, elementSagittal);
content.appendChild(viewportGrid);

addToggleButtonToToolbar({
  title: 'Hide All Segments',
  onClick: (toggle) => {
    Object.values(VP_ID).forEach((vp) =>
      segmentation.config.visibility.setSegmentationRepresentationVisibility(
        vp,
        {
          segmentationId,
          type: csToolsEnums.SegmentationRepresentations.Contour,
        },
        !toggle
      )
    );
  },
});

addSliderToToolbar({
  title: 'Change Segments Thickness',
  range: [0.1, 10],
  defaultValue: 4,
  onSelectedValueChange: (value) => {
    segmentation.config.style.setStyle(
      { type: csToolsEnums.SegmentationRepresentations.Contour },
      { outlineWidth: Number(value) }
    );
  },
});

async function addSegmentationsToState(type) {
  const segId = segmentationId + type;
  const geometryIds = await createAndCacheGeometriesFromContours('axial');

  segmentation.addSegmentations([
    {
      segmentationId: segId,
      representation: {
        type: csToolsEnums.SegmentationRepresentations.Contour,
        data: { geometryIds },
      },
    },
  ]);
  return segId;
}

function getOrientationForViewportId(viewportId) {
  switch (viewportId) {
    case VP_ID.AXIAL:
      return OrientationAxis.AXIAL;
    case VP_ID.CORONAL:
      return OrientationAxis.CORONAL;
    case VP_ID.SAGITTAL:
      return OrientationAxis.SAGITTAL;
    default:
      return OrientationAxis.AXIAL;
  }
}

async function setVolumeForViewports(renderingEngine, volumeId, viewportIds) {
  for (const viewportId of viewportIds) {
    const viewport = renderingEngine.getViewport(viewportId);
    if (viewport instanceof cornerstone3D.VolumeViewport) {
      await viewport.setVolumes([{ volumeId }]);
      const orientation = getOrientationForViewportId(viewportId);
      viewport.setOrientation(orientation);

      // Set default HNC window level for all viewports
      viewport.setProperties({
        voiRange: {
          lower: 40 - 350 / 2,
          upper: 40 + 350 / 2,
        },
      });
    } else {
      console.warn(`Viewport ${viewportId} is not a VolumeViewport. Skipping.`);
    }
  }
}

async function run() {
  await initDemo();
  imageLoader.registerImageLoader('nifti', cornerstoneNiftiImageLoader);

  cornerstoneTools.addTool(PanTool);
  cornerstoneTools.addTool(ZoomTool);
  cornerstoneTools.addTool(StackScrollTool);
  cornerstoneTools.addTool(TrackballRotateTool);

  const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
  toolGroup.addTool(PanTool.toolName);
  toolGroup.addTool(ZoomTool.toolName);
  toolGroup.addTool(StackScrollTool.toolName);

  toolGroup.setToolActive(PanTool.toolName, {
    bindings: [{ mouseButton: MouseBindings.Auxiliary }],
  });
  toolGroup.setToolActive(ZoomTool.toolName, {
    bindings: [{ mouseButton: MouseBindings.Secondary }],
  });
  toolGroup.setToolActive(StackScrollTool.toolName, {
    bindings: [{ mouseButton: MouseBindings.Wheel }],
  });

  const imageIds = await createNiftiImageIdsAndCacheMetadata({ url: niftiURL });
  const volume = await volumeLoader.createAndCacheVolume(volumeId, {
    imageIds,
  });
  await volume.load();

  const renderingEngineId = 'myRenderingEngine';
  const renderingEngine = new RenderingEngine(renderingEngineId);

  const viewportInputArray = [
    {
      viewportId: VP_ID.AXIAL,
      type: ViewportType.ORTHOGRAPHIC,
      element: elementAxial,
      defaultOptions: {
        orientation: OrientationAxis.AXIAL,
        background: <Types.Point3>[0.2, 0, 0.2],
      },
    },
    {
      viewportId: VP_ID.CORONAL,
      type: ViewportType.ORTHOGRAPHIC,
      element: elementCoronal,
      defaultOptions: {
        orientation: OrientationAxis.CORONAL,
        background: <Types.Point3>[0, 0.2, 0.2],
      },
    },
    {
      viewportId: VP_ID.SAGITTAL,
      type: ViewportType.ORTHOGRAPHIC,
      element: elementSagittal,
      defaultOptions: {
        orientation: OrientationAxis.SAGITTAL,
        background: <Types.Point3>[0.2, 0.2, 0],
      },
    },
  ];

  renderingEngine.setViewports(viewportInputArray);
  Object.values(VP_ID).forEach((vp) =>
    toolGroup.addViewport(vp, renderingEngineId)
  );

  await setVolumeForViewports(renderingEngine, volumeId, Object.values(VP_ID));
  renderingEngine.render();

  const segAxId = await addSegmentationsToState('axial');
  const segCorId = await addSegmentationsToState('sagittal');
  const segSagId = await addSegmentationsToState('coronal');

  segmentation.addSegmentationRepresentations(VP_ID.AXIAL, [
    {
      segmentationId: segAxId,
      type: csToolsEnums.SegmentationRepresentations.Contour,
    },
  ]);
  segmentation.addSegmentationRepresentations(VP_ID.CORONAL, [
    {
      segmentationId: segCorId,
      type: csToolsEnums.SegmentationRepresentations.Contour,
    },
  ]);
  segmentation.addSegmentationRepresentations(VP_ID.SAGITTAL, [
    {
      segmentationId: segSagId,
      type: csToolsEnums.SegmentationRepresentations.Contour,
    },
  ]);

  const style = { renderFill: false };
  segmentation.segmentationStyle.setStyle(
    {
      segmentationId: segAxId,
      viewportId: VP_ID.AXIAL,
      type: csToolsEnums.SegmentationRepresentations.Contour,
    },
    style
  );
  segmentation.segmentationStyle.setStyle(
    {
      segmentationId: segCorId,
      viewportId: VP_ID.CORONAL,
      type: csToolsEnums.SegmentationRepresentations.Contour,
    },
    style
  );
  segmentation.segmentationStyle.setStyle(
    {
      segmentationId: segSagId,
      viewportId: VP_ID.SAGITTAL,
      type: csToolsEnums.SegmentationRepresentations.Contour,
    },
    style
  );

  renderingEngine.render();
}

run();
