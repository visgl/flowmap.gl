import type {ScaleLegendModel} from './types';
import {formatLegendRange, mixRgba, rgbaToCss} from './utils';

const LEGEND_CIRCLE_RADIUS = 10;
const LEGEND_CIRCLE_SECONDARY_RADIUS = 7;

export function CircleSizeLegend({
  legend,
}: {
  legend: ScaleLegendModel | undefined;
}) {
  const locationCircles = legend?.locationCircles;
  if (!locationCircles) return null;
  return (
    <div className="scale-legend-section scale-legend-circle-section">
      <div className="scale-legend-title">
        Circle size {legend?.locked ? '(locked)' : ''}
      </div>
      <CircleLegendExample
        label="Incoming > outgoing"
        innerRadius={LEGEND_CIRCLE_RADIUS}
        outerRadius={LEGEND_CIRCLE_SECONDARY_RADIUS}
        colors={locationCircles.colors}
      />
      <CircleLegendExample
        label="Outgoing > incoming"
        innerRadius={LEGEND_CIRCLE_SECONDARY_RADIUS}
        outerRadius={LEGEND_CIRCLE_RADIUS}
        colors={locationCircles.colors}
      />
      <div className="scale-legend-note">
        Range: {formatLegendRange(locationCircles.domain)}
      </div>
      {locationCircles.outOfScale && (
        <div className="scale-legend-row">
          <span
            className="scale-legend-circle"
            style={{
              backgroundColor: rgbaToCss(locationCircles.outOfScale.color),
              width: `${LEGEND_CIRCLE_RADIUS * 2}px`,
              height: `${LEGEND_CIRCLE_RADIUS * 2}px`,
            }}
          />
          <span>{locationCircles.outOfScale.magnitudeLabel}</span>
        </div>
      )}
    </div>
  );
}

function CircleLegendExample({
  label,
  innerRadius,
  outerRadius,
  colors,
}: {
  label: string;
  innerRadius: number;
  outerRadius: number;
  colors: NonNullable<ScaleLegendModel['locationCircles']>['colors'];
}) {
  const size = Math.max(innerRadius, outerRadius) * 2;
  const innerSize = innerRadius * 2;
  const outerSize = outerRadius * 2;
  const outgoingDominant = outerRadius > innerRadius;
  const incomingDominant = innerRadius > outerRadius;
  return (
    <div className="scale-legend-row">
      <span
        className={`scale-legend-circle-example ${
          incomingDominant ? 'scale-legend-circle-example-incoming' : ''
        }`}
        style={{width: size, height: size}}
      >
        <span
          className="scale-legend-circle-outer"
          style={{
            width: outgoingDominant ? outerSize : innerSize,
            height: outgoingDominant ? outerSize : innerSize,
            backgroundColor: rgbaToCss(
              outgoingDominant ? colors.outgoing : colors.incoming,
            ),
            borderColor: outgoingDominant
              ? rgbaToCss(mixRgba(colors.incoming, colors.outgoing, 0.4))
              : rgbaToCss(colors.incoming),
          }}
        />
        {incomingDominant ? (
          <span
            className="scale-legend-circle-ring"
            style={{
              width: outerSize,
              height: outerSize,
              borderColor: rgbaToCss(colors.outgoing),
            }}
          />
        ) : (
          <span
            className="scale-legend-circle-inner"
            style={{
              width: innerSize,
              height: innerSize,
              backgroundColor: rgbaToCss(colors.incoming),
            }}
          />
        )}
      </span>
      <span>{label}</span>
    </div>
  );
}
