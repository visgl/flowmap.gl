/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */
import {Widget} from '@deck.gl/core';
import type {WidgetPlacement, WidgetProps} from '@deck.gl/core';
import type {RGBA, ScaleState} from '@flowmap.gl/data';

export type FlowmapLegendWidgetSection = 'flowThickness' | 'locationCircles';

export type FlowmapLegendWidgetProps = WidgetProps & {
  /** Widget positioning within the view. */
  placement?: WidgetPlacement;
  /** View to attach to. Required when using multiple views. */
  viewId?: string | null;
  /** Scale state emitted by `FlowmapLayer.onScaleChange`. */
  scaleState?: ScaleState;
  /** Match the legend presentation to a dark or light map theme. */
  darkMode?: boolean;
  /** Legend sections to render. Omit to show all available sections. */
  sections?: readonly FlowmapLegendWidgetSection[];
  /** Whether to show the scale lock control when `onToggleLock` is provided. */
  showLockControl?: boolean;
  /** Called when the lock button is clicked. Omit to hide the button. */
  onToggleLock?: (locked: boolean) => void;
  /** CSS class names for internal legend slots. Useful with utility CSS frameworks. */
  classNames?: FlowmapLegendWidgetClassNames;
  /** Disable built-in presentation styles. Dynamic sizes and colors are still applied. */
  unstyled?: boolean;
};

export type FlowmapLegendWidgetClassNames = {
  root?: string;
  section?: string;
  sectionSeparated?: string;
  title?: string;
  note?: string;
  row?: string;
  line?: string;
  circle?: string;
  circleExample?: string;
  circlePart?: string;
  lockButton?: string;
  lockButtonLocked?: string;
  lockIcon?: string;
  lockLabel?: string;
};

const LEGEND_CIRCLE_RADIUS = 10;
const LEGEND_CIRCLE_SECONDARY_RADIUS = 7;
const DEFAULT_ATTRIBUTION_OFFSET = '44px';
const DEFAULT_VIEWPORT_EDGE_OFFSET = '12px';
const DEFAULT_SECTIONS: readonly FlowmapLegendWidgetSection[] = [
  'flowThickness',
  'locationCircles',
];

type RenderOptions = {
  classNames: FlowmapLegendWidgetClassNames;
  theme: LegendTheme;
  unstyled: boolean;
};

type LegendTheme = {
  backgroundColor: string;
  borderColor: string;
  color: string;
  noteColor: string;
  separatorColor: string;
  lineOutlineColor: string;
  markerBorderColor: string;
  markerOutlineColor: string;
  buttonBorderColor: string;
  buttonBackgroundColor: string;
  lockedButtonBorderColor: string;
  lockedButtonBackgroundColor: string;
};

export default class FlowmapLegendWidget extends Widget<FlowmapLegendWidgetProps> {
  static defaultProps: Required<FlowmapLegendWidgetProps> = {
    ...Widget.defaultProps,
    id: 'flowmap-legend',
    placement: 'bottom-right',
    viewId: null,
    scaleState: undefined!,
    darkMode: true,
    sections: DEFAULT_SECTIONS,
    showLockControl: true,
    onToggleLock: undefined!,
    classNames: {},
    unstyled: false,
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
    syncRootClassName(rootElement, this);
    const renderOptions = {
      classNames: this.props.classNames ?? {},
      theme: getLegendTheme(this.props.darkMode ?? true),
      unstyled: this.props.unstyled ?? false,
    };
    applyLegendRootStyles(
      rootElement,
      this.props.style,
      this.placement,
      renderOptions,
    );

    const {scaleState} = this.props;
    const sections = this.props.sections ?? DEFAULT_SECTIONS;
    const showFlowThickness =
      sections.includes('flowThickness') && Boolean(scaleState?.flowThickness);
    const showLocationCircles =
      sections.includes('locationCircles') &&
      Boolean(scaleState?.locationCircles);
    const showLockControl =
      Boolean(scaleState) &&
      this.props.showLockControl !== false &&
      Boolean(this.props.onToggleLock);

    if (!showFlowThickness && !showLocationCircles && !showLockControl) {
      rootElement.style.display = 'none';
      return;
    }
    rootElement.style.display = 'block';

    if (showFlowThickness) {
      rootElement.append(
        renderFlowThicknessSection(scaleState!, renderOptions),
      );
    }
    if (showLocationCircles) {
      rootElement.append(
        renderLocationCirclesSection(
          scaleState!,
          renderOptions,
          showFlowThickness,
        ),
      );
    }
    if (showLockControl) {
      rootElement.append(
        renderScaleLockControl(scaleState!.locked, renderOptions, () => {
          this.props.onToggleLock?.(!scaleState!.locked);
        }),
      );
    }
  }
}

function renderFlowThicknessSection(
  scaleState: ScaleState,
  options: RenderOptions,
): HTMLElement {
  const flowThickness = scaleState.flowThickness!;
  const section = createSlotElement('div', 'section', options);
  section.append(
    renderTitle(
      `Flow thickness ${scaleState.locked ? '(locked)' : ''}`,
      options,
    ),
  );

  for (const sample of flowThickness.samples) {
    section.append(
      renderRow(
        renderLine(sample.color, Math.max(2, sample.thickness), options),
        formatLegendValue(sample.magnitude),
        '58px 1fr',
        options,
      ),
    );
  }

  if (flowThickness.outOfScale) {
    section.append(
      renderRow(
        renderLine(
          flowThickness.outOfScale.color,
          Math.max(2, flowThickness.outOfScale.thickness),
          options,
        ),
        `> ${formatLegendValue(flowThickness.outOfScale.magnitude)}`,
        '58px 1fr',
        options,
      ),
    );
  }
  return section;
}

function renderLocationCirclesSection(
  scaleState: ScaleState,
  options: RenderOptions,
  separated: boolean,
): HTMLElement {
  const locationCircles = scaleState.locationCircles!;
  const section = createSlotElement('div', 'section', options);
  if (separated) {
    addClasses(section, 'flowmap-legend-section-separated');
    addClasses(section, options.classNames.sectionSeparated);
    if (!options.unstyled) {
      section.style.marginTop = '12px';
      section.style.paddingTop = '12px';
      section.style.borderTop = `1px solid ${options.theme.separatorColor}`;
    }
  } else if (!options.unstyled) {
    section.style.marginTop = '0';
    section.style.paddingTop = '0';
    section.style.borderTop = '0';
  }
  section.append(
    renderTitle(`Circle size ${scaleState.locked ? '(locked)' : ''}`, options),
  );
  section.append(
    renderRow(
      renderCircleExample(
        LEGEND_CIRCLE_RADIUS,
        LEGEND_CIRCLE_SECONDARY_RADIUS,
        locationCircles.colors,
        options,
      ),
      'Incoming > outgoing',
      '28px 1fr',
      options,
    ),
  );
  section.append(
    renderRow(
      renderCircleExample(
        LEGEND_CIRCLE_SECONDARY_RADIUS,
        LEGEND_CIRCLE_RADIUS,
        locationCircles.colors,
        options,
      ),
      'Outgoing > incoming',
      '28px 1fr',
      options,
    ),
  );

  const range = createSlotElement('div', 'note', options);
  range.textContent = `Range: ${formatLegendRange(locationCircles.domain)}`;
  if (!options.unstyled) {
    range.style.marginTop = '8px';
    range.style.marginBottom = '6px';
    range.style.color = options.theme.noteColor;
  }
  section.append(range);

  if (locationCircles.outOfScale) {
    section.append(
      renderRow(
        renderCircle(
          locationCircles.outOfScale.color,
          LEGEND_CIRCLE_RADIUS,
          options,
        ),
        `> ${formatLegendValue(locationCircles.outOfScale.magnitude)}`,
        '28px 1fr',
        options,
      ),
    );
  }
  return section;
}

function renderScaleLockControl(
  locked: boolean,
  options: RenderOptions,
  onClick: () => void,
): HTMLElement {
  const button = createSlotElement('button', 'lockButton', options);
  if (locked) {
    addClasses(button, 'flowmap-legend-lock-button-locked');
    addClasses(button, options.classNames.lockButtonLocked);
  }
  button.type = 'button';
  button.setAttribute('aria-pressed', String(locked));
  if (options.unstyled) {
    button.style.pointerEvents = 'auto';
  } else {
    Object.assign(button.style, {
      display: 'flex',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      margin: '12px 0 0',
      border: locked
        ? `1px solid ${options.theme.lockedButtonBorderColor}`
        : `1px solid ${options.theme.buttonBorderColor}`,
      borderRadius: '4px',
      background: locked
        ? options.theme.lockedButtonBackgroundColor
        : options.theme.buttonBackgroundColor,
      color: 'inherit',
      font: 'inherit',
      fontWeight: '600',
      padding: '6px 8px',
      cursor: 'pointer',
      pointerEvents: 'auto',
    });
  }
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });

  const icon = createSlotElement('span', 'lockIcon', options);
  if (!options.unstyled) {
    Object.assign(icon.style, {
      display: 'block',
      width: '10px',
      height: '8px',
      border: '1px solid currentColor',
      borderRadius: '2px',
    });
  }

  const label = createSlotElement('span', 'lockLabel', options);
  label.textContent = locked ? 'Unlock scales' : 'Lock scales';
  button.append(icon, label);
  return button;
}

function renderTitle(text: string, options: RenderOptions): HTMLElement {
  const title = createSlotElement('div', 'title', options);
  title.textContent = text;
  if (!options.unstyled) {
    title.style.marginBottom = '8px';
    title.style.fontWeight = '600';
  }
  return title;
}

function renderRow(
  marker: HTMLElement,
  text: string,
  columns: string,
  options: RenderOptions,
): HTMLElement {
  const row = createSlotElement('div', 'row', options);
  if (options.unstyled) {
    row.style.gridTemplateColumns = columns;
  } else {
    Object.assign(row.style, {
      display: 'grid',
      gridTemplateColumns: columns,
      alignItems: 'center',
      minHeight: '20px',
      gap: '8px',
      marginTop: '2px',
    });
  }
  const label = createElement('span');
  label.textContent = text;
  row.append(marker, label);
  return row;
}

function renderLine(
  color: RGBA,
  height: number,
  options: RenderOptions,
): HTMLElement {
  const line = createSlotElement('span', 'line', options);
  if (!options.unstyled) {
    Object.assign(line.style, {
      display: 'block',
      borderRadius: '2px',
      boxShadow: `0 0 0 1px ${options.theme.lineOutlineColor}`,
    });
  }
  Object.assign(line.style, {
    width: '48px',
    height: `${height}px`,
    backgroundColor: rgbaToCss(color),
  });
  return line;
}

function renderCircle(
  color: RGBA,
  radius: number,
  options: RenderOptions,
): HTMLElement {
  const circle = createSlotElement('span', 'circle', options);
  const size = `${radius * 2}px`;
  if (!options.unstyled) {
    Object.assign(circle.style, {
      display: 'block',
      justifySelf: 'center',
      border: `1px solid ${options.theme.markerBorderColor}`,
      borderRadius: '999px',
    });
  }
  Object.assign(circle.style, {
    width: size,
    height: size,
    backgroundColor: rgbaToCss(color),
  });
  return circle;
}

function renderCircleExample(
  innerRadius: number,
  outerRadius: number,
  colors: NonNullable<ScaleState['locationCircles']>['colors'],
  options: RenderOptions,
): HTMLElement {
  const size = Math.max(innerRadius, outerRadius) * 2;
  const innerSize = innerRadius * 2;
  const outerSize = outerRadius * 2;
  const outgoingDominant = outerRadius > innerRadius;
  const incomingDominant = innerRadius > outerRadius;
  const root = createSlotElement('span', 'circleExample', options);
  if (!options.unstyled) {
    Object.assign(root.style, {
      position: 'relative',
      display: 'block',
      justifySelf: 'center',
    });
  }
  Object.assign(root.style, {
    width: `${size}px`,
    height: `${size}px`,
  });

  const outer = createSlotElement('span', 'circlePart', options);
  if (!options.unstyled) Object.assign(outer.style, circlePartStyles());
  Object.assign(outer.style, {
    width: `${outgoingDominant ? outerSize : innerSize}px`,
    height: `${outgoingDominant ? outerSize : innerSize}px`,
    backgroundColor: rgbaToCss(
      outgoingDominant ? colors.outgoing : colors.incoming,
    ),
  });
  if (!options.unstyled) {
    outer.style.border = `1px solid ${
      outgoingDominant
        ? rgbaToCss(mixRgba(colors.incoming, colors.outgoing, 0.4))
        : options.theme.markerBorderColor
    }`;
  }
  root.append(outer);

  if (incomingDominant) {
    const ring = createSlotElement('span', 'circlePart', options);
    if (!options.unstyled) Object.assign(ring.style, circlePartStyles());
    Object.assign(ring.style, {
      width: `${outerSize}px`,
      height: `${outerSize}px`,
    });
    if (!options.unstyled) {
      ring.style.border = `1px solid ${rgbaToCss(colors.outgoing)}`;
      ring.style.boxShadow = `0 0 0 1px ${options.theme.markerOutlineColor}`;
    }
    root.append(ring);
  } else {
    const inner = createSlotElement('span', 'circlePart', options);
    if (!options.unstyled) Object.assign(inner.style, circlePartStyles());
    Object.assign(inner.style, {
      width: `${innerSize}px`,
      height: `${innerSize}px`,
      backgroundColor: rgbaToCss(colors.incoming),
    });
    if (!options.unstyled) {
      inner.style.border = `1px solid ${options.theme.markerBorderColor}`;
    }
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
  placement: WidgetPlacement,
  options: RenderOptions,
): void {
  rootElement.style.pointerEvents = 'auto';
  if (!options.unstyled) {
    Object.assign(rootElement.style, {
      boxSizing: 'border-box',
      border: `1px solid var(--flowmap-legend-border-color, ${
        options.theme.borderColor
      })`,
      borderRadius: '5px',
      backgroundColor: `var(--flowmap-legend-background, ${
        options.theme.backgroundColor
      })`,
      color: `var(--flowmap-legend-color, ${options.theme.color})`,
      fontFamily:
        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontSize: '10px',
      padding: '10px',
    });
  } else {
    Object.assign(rootElement.style, {
      boxSizing: '',
      border: '',
      borderRadius: '',
      backgroundColor: '',
      color: '',
      fontFamily: '',
      fontSize: '',
      padding: '',
    });
  }
  Object.assign(rootElement.style, style);
}

function getLegendTheme(darkMode: boolean): LegendTheme {
  return darkMode
    ? {
        backgroundColor: 'rgba(38, 38, 38, 0.72)',
        borderColor: 'rgba(255, 255, 255, 0.22)',
        color: 'white',
        noteColor: 'rgba(255, 255, 255, 0.82)',
        separatorColor: 'rgba(255, 255, 255, 0.22)',
        lineOutlineColor: 'rgba(255, 255, 255, 0.28)',
        markerBorderColor: 'rgba(255, 255, 255, 0.8)',
        markerOutlineColor: 'rgba(255, 255, 255, 0.72)',
        buttonBorderColor: 'rgba(255, 255, 255, 0.32)',
        buttonBackgroundColor: 'rgba(255, 255, 255, 0.08)',
        lockedButtonBorderColor: 'rgba(209, 238, 234, 0.7)',
        lockedButtonBackgroundColor: 'rgba(209, 238, 234, 0.18)',
      }
    : {
        backgroundColor: 'rgba(243, 244, 246, 0.78)',
        borderColor: 'rgba(17, 24, 39, 0.18)',
        color: 'rgba(17, 24, 39, 0.94)',
        noteColor: 'rgba(31, 41, 55, 0.78)',
        separatorColor: 'rgba(17, 24, 39, 0.16)',
        lineOutlineColor: 'rgba(17, 24, 39, 0.18)',
        markerBorderColor: 'rgba(17, 24, 39, 0.38)',
        markerOutlineColor: 'rgba(17, 24, 39, 0.28)',
        buttonBorderColor: 'rgba(17, 24, 39, 0.22)',
        buttonBackgroundColor: 'rgba(17, 24, 39, 0.05)',
        lockedButtonBorderColor: 'rgba(13, 148, 136, 0.55)',
        lockedButtonBackgroundColor: 'rgba(13, 148, 136, 0.12)',
      };
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

function createSlotElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  slot: keyof FlowmapLegendWidgetClassNames,
  options?: RenderOptions,
): HTMLElementTagNameMap[K] {
  const element = createElement(tagName, `flowmap-legend-${kebabCase(slot)}`);
  if (options) addClasses(element, options.classNames[slot]);
  return element;
}

function syncRootClassName(
  rootElement: HTMLElement,
  widget: FlowmapLegendWidget,
): void {
  rootElement.className = [
    'deck-widget',
    widget.className,
    widget.props.darkMode === false
      ? 'flowmap-legend-widget-light'
      : 'flowmap-legend-widget-dark',
    widget.props.className,
    widget.props.classNames?.root,
  ]
    .filter(Boolean)
    .join(' ');
}

function addClasses(element: HTMLElement, classNames?: string): void {
  if (!classNames) return;
  element.classList.add(...classNames.split(/\s+/).filter(Boolean));
}

function kebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function clear(element: HTMLElement): void {
  while (element.firstChild) {
    element.firstChild.remove();
  }
}
