import type {RGBA} from '@flowmap.gl/data';

export type FlowScaleLegendSample = {
  label: string;
  magnitude: number;
  thickness: number;
  color: RGBA;
};

export type ScaleLegendModel = {
  locked: boolean;
  flowThickness?: {
    domain: [number, number];
    thicknessRange: [number, number];
    samples: FlowScaleLegendSample[];
    outOfScale?: {
      label: string;
      color: RGBA;
      magnitudeLabel: string;
      thickness: number;
    };
  };
  locationCircles?: {
    domain: [number, number];
    radiusRange: [number, number];
    incomingLabel: string;
    outgoingLabel: string;
    colors: {
      incoming: RGBA;
      outgoing: RGBA;
      empty: RGBA;
    };
    outOfScale?: {
      label: string;
      color: RGBA;
      magnitudeLabel: string;
      radius: number;
    };
  };
};
