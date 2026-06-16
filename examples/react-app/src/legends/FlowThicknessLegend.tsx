import {ScaleLegendModel} from '@flowmap.gl/data';
import {rgbaToCss} from './utils';

export function FlowThicknessLegend({
  legend,
}: {
  legend: ScaleLegendModel | undefined;
}) {
  const flowThickness = legend?.flowThickness;
  if (!flowThickness) return null;
  return (
    <div className="scale-legend-section scale-legend-flow-section">
      <div className="scale-legend-title">
        Flow thickness {legend?.locked ? '(locked)' : ''}
      </div>
      {flowThickness.samples.map((sample) => (
        <div className="scale-legend-row" key={sample.label}>
          <span
            className="scale-legend-line"
            style={{
              backgroundColor: rgbaToCss(sample.color),
              height: `${Math.max(2, sample.thickness)}px`,
            }}
          />
          <span>{sample.label}</span>
        </div>
      ))}
      {flowThickness.outOfScale && (
        <div className="scale-legend-row">
          <span
            className="scale-legend-line"
            style={{
              backgroundColor: rgbaToCss(flowThickness.outOfScale.color),
              height: `${Math.max(2, flowThickness.outOfScale.thickness)}px`,
            }}
          />
          <span>{flowThickness.outOfScale.magnitudeLabel}</span>
        </div>
      )}
    </div>
  );
}
