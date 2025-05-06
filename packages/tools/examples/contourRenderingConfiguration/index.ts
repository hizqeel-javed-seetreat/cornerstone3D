import type { Types } from '@cornerstonejs/core';
import {
  Enums,
  geometryLoader,
  RenderingEngine,
  setVolumesForViewports,
  volumeLoader,
} from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import {
  addSliderToToolbar,
  addToggleButtonToToolbar,
  createAndCacheGeometriesFromContours,
  createImageIdsAndCacheMetaData,
  initDemo,
  setTitleAndDescription,
} from '../../../../utils/demo/helpers';

console.debug('Click on index.ts to open source code for this example ---->');

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
const { ViewportType } = Enums;

/* ------------------------------------------------------------------ */
/*  ⚙️  CONSTANTS                                                     */
/* ------------------------------------------------------------------ */
const volumeName = 'CT_VOLUME_ID';
const volumeLoaderScheme = 'cornerstoneStreamingImageVolume';
const volumeId = `${volumeLoaderScheme}:${volumeName}`;

const segmentationId = 'MY_SEGMENTATION_ID';
const toolGroupId = 'MY_TOOLGROUP_ID';

const VP_ID = {
  AXIAL: 'CT_AXIAL',
  CORONAL: 'CT_CORONAL',
  SAGITTAL: 'CT_SAGITTAL',
};

/* ------------------------------------------------------------------ */
/*  🖼️  PAGE LAYOUT                                                   */
/* ------------------------------------------------------------------ */
setTitleAndDescription(
  'Contour Segmentation – Axial + Coronal + Sagittal',
  'This example shows how to turn one axial viewport into a 3‑pane orthographic viewer.'
);

const size = '500px';
const content = document.getElementById('content')!;
const viewportGrid = document.createElement('div');
viewportGrid.style.display = 'flex';
viewportGrid.style.flexDirection = 'row';
viewportGrid.style.gap = '4px'; // a tiny gutter

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

const instructions = document.createElement('p');
content.append(instructions);

/* ------------------------------------------------------------------ */
/*  🛠️  TOOLBAR HANDLERS                                              */
/* ------------------------------------------------------------------ */
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

addToggleButtonToToolbar({
  title: 'Hide Red Segment',
  onClick: (toggle) => {
    const segmentIndex = 1;
    Object.values(VP_ID).forEach((vp) =>
      segmentation.config.visibility.setSegmentIndexVisibility(
        vp,
        segmentationId,
        csToolsEnums.SegmentationRepresentations.Contour,
        segmentIndex,
        !toggle
      )
    );
  },
});

addToggleButtonToToolbar({
  title: 'Hide Green Segment',
  onClick: (toggle) => {
    const segmentIndex = 2;
    Object.values(VP_ID).forEach((vp) =>
      segmentation.config.visibility.setSegmentIndexVisibility(
        vp,
        segmentationId,
        csToolsEnums.SegmentationRepresentations.Contour,
        segmentIndex,
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

/* ------------------------------------------------------------------ */
/*  🏗️  SEGMENTATION SET‑UP                                           */
/* ------------------------------------------------------------------ */
async function addSegmentationsToState(
  type: 'axial' | 'coronal' | 'sagittal' = 'axial'
) {
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

/* ------------------------------------------------------------------ */
/*  🚀  MAIN DEMO ENTRY                                               */
/* ------------------------------------------------------------------ */
async function run() {
  await initDemo();

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

  const imageIds = await createImageIdsAndCacheMetaData({
    StudyInstanceUID:
      '1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463',
    SeriesInstanceUID:
      '1.3.6.1.4.1.14519.5.2.1.7009.2403.226151125820845824875394858561',
    wadoRsRoot: 'https://d14fa38qiwhyfd.cloudfront.net/dicomweb',
  });

  const volume = await volumeLoader.createAndCacheVolume(volumeId, {
    imageIds,
  });
  const segAxId = await addSegmentationsToState('axial');
  const segCorId = await addSegmentationsToState('sagittal');
  const segSagId = await addSegmentationsToState('coronal');

  const renderingEngineId = 'myRenderingEngine';
  const renderingEngine = new RenderingEngine(renderingEngineId);

  /* ------------ VIEWPORT DEFINITIONS ------------------------------ */
  const viewportInputArray = [
    {
      viewportId: VP_ID.AXIAL,
      type: ViewportType.ORTHOGRAPHIC,
      element: elementAxial,
      defaultOptions: {
        orientation: Enums.OrientationAxis.AXIAL,
        background: <Types.Point3>[0.2, 0, 0.2],
      },
    },
    {
      viewportId: VP_ID.CORONAL,
      type: ViewportType.ORTHOGRAPHIC,
      element: elementCoronal,
      defaultOptions: {
        orientation: Enums.OrientationAxis.CORONAL,
        background: <Types.Point3>[0, 0.2, 0.2],
      },
    },
    {
      viewportId: VP_ID.SAGITTAL,
      type: ViewportType.ORTHOGRAPHIC,
      element: elementSagittal,
      defaultOptions: {
        orientation: Enums.OrientationAxis.SAGITTAL,
        background: <Types.Point3>[0.2, 0.2, 0],
      },
    },
  ];

  renderingEngine.setViewports(viewportInputArray);

  /* ----------- LINK TOOL GROUP TO EVERY VIEWPORT ------------------ */
  Object.values(VP_ID).forEach((vp) =>
    toolGroup.addViewport(vp, renderingEngineId)
  );

  volume.load();

  setVolumesForViewports(
    renderingEngine,
    [{ volumeId }],
    Object.values(VP_ID) // all three viewport IDs
  );

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

  const style = {
    renderFill: false,
  };

  segmentation.segmentationStyle.setStyle(
    {
      segmentationId: segAxId,
      viewportId: VP_ID.AXIAL,
      type: csToolsEnums.SegmentationRepresentations.Contour,
    },
    {
      ...style,
    }
  );

  segmentation.segmentationStyle.setStyle(
    {
      segmentationId: segCorId,
      viewportId: VP_ID.CORONAL,
      type: csToolsEnums.SegmentationRepresentations.Contour,
    },
    {
      ...style,
    }
  );

  segmentation.segmentationStyle.setStyle(
    {
      segmentationId: segSagId,
      viewportId: VP_ID.SAGITTAL,
      type: csToolsEnums.SegmentationRepresentations.Contour,
    },
    {
      ...style,
    }
  );
  /* ----------- ADD SEGMENTATION REPRESENTATION -------------------- */
  // await Promise.all(
  //   Object.values(VP_ID).map((vp) =>
  //     segmentation.addSegmentationRepresentations(vp, [
  //       {
  //         segmentationId,
  //         type: csToolsEnums.SegmentationRepresentations.Contour,
  //       },
  //     ])
  //   )
  // );

  renderingEngine.render();
}

run();
