/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */
import {Widget} from '@deck.gl/core';
import type {WidgetPlacement, WidgetProps} from '@deck.gl/core';
import type {RGBA, ScaleState} from '@flowmap.gl/data';

export type FlowmapLegendWidgetProps = WidgetProps & {
  /** Widget positioning within the view. */
  placement?: WidgetPlacement;
  /** View to attach to. Required when using multiple views. */
  viewId?: string | null;
  /** Scale state emitted by `FlowmapLayer.onScaleChange`. */
  scaleState?: ScaleState;
  /** Called when the lock button is clicked. Omit to hide the button. */
  onToggleLock?: (locked: boolean) => void;
};

const LEGEND_CIRCLE_RADIUS = 10;
const LEGEND_CIRCLE_SECONDARY_RADIUS = 7;

export default class FlowmapLegendWidget extends Widget<FlowmapLegendWidgetProps> {
  static defaultProps: Required<FlowmapLegendWidgetProps> = {
    ...Widget.defaultProps,
    id: 'flowmap-legend',
    placement: 'bottom-right',
    viewId: null,
    scaleState: undefined!,
    onToggleLock: undefined!,
  };

  className = 'flowmap-legend-widget';
  placement: WidgetPlacement = 'bottom-right';

  constructor(props: FlowmapLegendWidgetProps = {}) {
    super(props);
    this.setProps(this.props);
  }

  setProps(props: Partial<FlowmapLegendWidgetProps>): void {
    this.placement = props.placement ?? this.placement;
    this.viewId = props.viewId ?? this.viewId;
    super.setProps(props);
  }

  onRenderHTML(rootElement: HTMLElement): void {
    clear(rootElement);
    applyLegendRootStyles(rootElement, this.props.style);

    const {scaleState} = this.props;
    if (!scaleState?.flowThickness && !scaleState?.locationCircles) {
      rootElement.style.display = 'none';
      return;
    }
    rootElement.style.display = 'block';

    if (scaleState.flowThickness) {
      rootElement.append(renderFlowThickness(scaleState));
    }
    if (scaleState.locationCircles) {
      rootElement.append(renderCircleSize(scaleState));
    }
    if (this.props.onToggleLock) {
      rootElement.append(
        renderLockButton(scaleState.locked, () => {
          this.props.onToggleLock?.(!scaleState.locked);
        }),
      );
    }
  }
}

function renderFlowThickness(scaleState: ScaleState): HTMLElement {
  const flowThickness = scaleState.flowThickness!;
  const section = createElement('div', 'flowmap-legend-section');
  section.append(renderTitle(`Flow thickness ${scaleState.locked ? '(locked)' : ''}`));

  for (const sample of flowThickness.samples) {
    section.append(
      renderRow(
        renderLine(sample.color, Math.max(2, sample.thickness)),
        formatLegendValue(sample.magnitude),
        '58px 1fr',
      ),
    );
  }

  if (flowThickness.outOfScale) {
    section.append(
      renderRow(
        renderLine(
          flowThickness.outOfScale.color,
          Math.max(2, flowThickness.outOfScale.thickness),
        ),
        `> ${formatLegendValue(flowThickness.outOfScale.magnitude)}`,
        '58px 1fr',
      ),
    );
  }
  return section;
}

function renderCircleSize(scaleState: ScaleState): HTMLElement {
  const locationCircles = scaleState.locationCircles!;
  const section = createElement('div', 'flowmap-legend-section');
  section.style.marginTop = scaleState.flowThickness ? '12px' : '0';
  section.style.paddingTop = scaleState.flowThickness ? '12px' : '0';
  section.style.borderTop = scaleState.flowThickness
    ? '1px solid rgba(255, 255, 255, 0.22)'
    : '0';
  section.append(renderTitle(`Circle size ${scaleState.locked ? '(locked)' : ''}`));
  section.append(
    renderRow(
      renderCircleExample(
        LEGEND_CIRCLE_RADIUS,
        LEGEND_CIRCLE_SECONDARY_RADIUS,
        locationCircles.colors,
      ),
      'Incoming > outgoing',
      '28px 1fr',
    ),
  );
  section.append(
    renderRow(
      renderCircleExample(
        LEGEND_CIRCLE_SECONDARY_RADIUS,
        LEGEND_CIRCLE_RADIUS,
        locationCircles.colors,
      ),
      'Outgoing > incoming',
      '28px 1fr',
    ),
  );

  const range = createElement('div', 'flowmap-legend-note');
  range.textContent = `Range: ${formatLegendRange(locationCircles.domain)}`;
  range.style.marginTop = '8px';
  range.style.marginBottom = '6px';
  range.style.color = 'rgba(255, 255, 255, 0.82)';
  section.append(range);

  if (locationCircles.outOfScale) {
    section.append(
      renderRow(
        renderCircle(locationCircles.outOfScale.color, LEGEND_CIRCLE_RADIUS),
        `> ${formatLegendValue(locationCircles.outOfScale.magnitude)}`,
        '28px 1fr',
      ),
    );
  }
  return section;
}

function renderLockButton(locked: boolean, onClick: () => void): HTMLElement {
  const button = createElement('button', 'flowmap-legend-lock-button');
  button.type = 'button';
  button.setAttribute('aria-pressed', String(locked));
  Object.assign(button.style, {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    margin: '12px 0 0',
    border: locked
      ? '1px solid rgba(209, 238, 234, 0.7)'
      : '1px solid rgba(255, 255, 255, 0.32)',
    borderRadius: '4px',
    background: locked ? 'rgba(209, 238, 234, 0.18)' : 'rgba(255, 255, 255, 0.08)',
    color: 'inherit',
    font: 'inherit',
    fontWeight: '600',
    padding: '6px 8px',
    cursor: 'pointer',
    pointerEvents: 'auto',
  });
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });

  const icon = createElement('span', 'flowmap-legend-lock-icon');
  Object.assign(icon.style, {
    display: 'block',
    width: '10px',
    height: '8px',
    border: '1px solid currentColor',
    borderRadius: '2px',
  });

  const label = createElement('span');
  label.textContent = locked ? 'Unlock scales' : 'Lock scales';
  button.append(icon, label);
  return button;
}

function renderTitle(text: string): HTMLElement {
  const title = createElement('div', 'flowmap-legend-title');
  title.textContent = text;
  title.style.marginBottom = '8px';
  title.style.fontWeight = '600';
  return title;
}

function renderRow(
  marker: HTMLElement,
  text: string,
  columns: string,
): HTMLElement {
  const row = createElement('div', 'flowmap-legend-row');
  Object.assign(row.style, {
    display: 'grid',
    gridTemplateColumns: columns,
    alignItems: 'center',
    minHeight: '20px',
    gap: '8px',
    marginTop: '2px',
  });
  const label = createElement('span');
  label.textContent = text;
  row.append(marker, label);
  return row;
}

function renderLine(color: RGBA, height: number): HTMLElement {
  const line = createElement('span', 'flowmap-legend-line');
  Object.assign(line.style, {
    display: 'block',
    width: '48px',
    height: `${height}px`,
    borderRadius: '2px',
    backgroundColor: rgbaToCss(color),
  });
  return line;
}

function renderCircle(color: RGBA, radius: number): HTMLElement {
  const circle = createElement('span', 'flowmap-legend-circle');
  const size = `${radius * 2}px`;
  Object.assign(circle.style, {
    display: 'block',
    justifySelf: 'center',
    width: size,
    height: size,
    border: '1px solid rgba(255, 255, 255, 0.8)',
    borderRadius: '999px',
    backgroundColor: rgbaToCss(color),
  });
  return circle;
}

function renderCircleExample(
  innerRadius: number,
  outerRadius: number,
  colors: NonNullable<ScaleState['locationCircles']>['colors'],
): HTMLElement {
  const size = Math.max(innerRadius, outerRadius) * 2;
  const innerSize = innerRadius * 2;
  const outerSize = outerRadius * 2;
  const outgoingDominant = outerRadius > innerRadius;
  const incomingDominant = innerRadius > outerRadius;
  const root = createElement('span', 'flowmap-legend-circle-example');
  Object.assign(root.style, {
    position: 'relative',
    display: 'block',
    justifySelf: 'center',
    width: `${size}px`,
    height: `${size}px`,
  });

  const outer = createElement('span');
  Object.assign(outer.style, circlePartStyles(), {
    width: `${outgoingDominant ? outerSize : innerSize}px`,
    height: `${outgoingDominant ? outerSize : innerSize}px`,
    backgroundColor: rgbaToCss(outgoingDominant ? colors.outgoing : colors.incoming),
    border: `1px solid ${
      outgoingDominant
        ? rgbaToCss(mixRgba(colors.incoming, colors.outgoing, 0.4))
        : rgbaToCss(colors.incoming)
    }`,
  });
  root.append(outer);

  if (incomingDominant) {
    const ring = createElement('span');
    Object.assign(ring.style, circlePartStyles(), {
      width: `${outerSize}px`,
      height: `${outerSize}px`,
      border: `1px solid ${rgbaToCss(colors.outgoing)}`,
      boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.72)',
    });
    root.append(ring);
  } else {
    const inner = createElement('span');
    Object.assign(inner.style, circlePartStyles(), {
      width: `${innerSize}px`,
      height: `${innerSize}px`,
      backgroundColor: rgbaToCss(colors.incoming),
      border: '1px solid rgba(255, 255, 255, 0.85)',
    });
    root.append(inner);
  }

  return root;
}

function circlePartStyles(): Partial<CSSStyleDeclaration> {
  return {
    position: 'absolute',
    left: '50%',
    top: '50%',
    boxSizing: 'border-box',
    borderRadius: '999px',
    transform: 'translate(-50%, -50%)',
  };
}

function applyLegendRootStyles(
  rootElement: HTMLElement,
  style: Partial<CSSStyleDeclaration>,
): void {
  Object.assign(rootElement.style, {
    boxSizing: 'border-box',
    borderRadius: '5px',
    backgroundColor: 'var(--flowmap-legend-background, rgba(25, 25, 25, 0.78))',
    color: 'var(--flowmap-legend-color, white)',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '10px',
    padding: '10px',
    pointerEvents: 'auto',
  });
  Object.assign(rootElement.style, style);
}

function formatLegendRange([min, max]: [number, number]): string {
  return `${formatLegendValue(min)} - ${formatLegendValue(max)}`;
}

function formatLegendValue(value: number): string {
  return value >= 1000
    ? value.toLocaleString(undefined, {maximumFractionDigits: 0})
    : value.toLocaleString(undefined, {maximumFractionDigits: 2});
}

function rgbaToCss([r, g, b, a]: RGBA): string {
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}

function mixRgba(from: RGBA, to: RGBA, amount: number): RGBA {
  return [
    Math.round(from[0] * (1 - amount) + to[0] * amount),
    Math.round(from[1] * (1 - amount) + to[1] * amount),
    Math.round(from[2] * (1 - amount) + to[2] * amount),
    Math.round(from[3] * (1 - amount) + to[3] * amount),
  ];
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  return element;
}

function clear(element: HTMLElement): void {
  while (element.firstChild) {
    element.firstChild.remove();
  }
}
