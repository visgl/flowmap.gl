import type {ReactNode} from 'react';
import {CircleSizeLegend} from './CircleSizeLegend';
import {FlowThicknessLegend} from './FlowThicknessLegend';

export function ScaleLegendRoot({children}: {children: ReactNode}) {
  return <div className="scale-legend">{children}</div>;
}

export const ScaleLegend = Object.assign(ScaleLegendRoot, {
  FlowThickness: FlowThicknessLegend,
  CircleSize: CircleSizeLegend,
});
