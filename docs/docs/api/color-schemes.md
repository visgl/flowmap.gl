---
sidebar_position: 2
---

# Color Schemes

flowmap.gl includes 40+ built-in color schemes and supports custom color schemes.

## Using Color Schemes

Set a color scheme using the `colorScheme` prop:

```typescript
new FlowmapLayer({
  colorScheme: 'Teal',  // Use a preset
  // ...
});
```

## Built-in Color Schemes

### Sequential Schemes (Single Hue)

| Name | Description |
|------|-------------|
| `Blues` | Light to dark blue |
| `Greens` | Light to dark green |
| `Greys` | Light to dark grey |
| `Oranges` | Light to dark orange |
| `Purples` | Light to dark purple |
| `Reds` | Light to dark red |

### Sequential Schemes (Multi-Hue)

| Name | Description |
|------|-------------|
| `BuGn` | Blue to green |
| `BuPu` | Blue to purple |
| `GnBu` | Green to blue |
| `OrRd` | Orange to red |
| `PuBu` | Purple to blue |
| `PuBuGn` | Purple to blue to green |
| `PuRd` | Purple to red |
| `RdPu` | Red to purple |
| `YlGn` | Yellow to green |
| `YlGnBu` | Yellow to green to blue |
| `YlOrBr` | Yellow to orange to brown |
| `YlOrRd` | Yellow to orange to red |

### Custom Sequential Schemes

| Name | Description |
|------|-------------|
| `Teal` | Default scheme. Teal shades (light to dark) |
| `BluGrn` | Blue-green gradient |
| `BluYl` | Blue to yellow |
| `BrwnYl` | Brown to yellow |
| `Burg` | Burgundy shades |
| `BurgYl` | Burgundy to yellow |
| `DarkMint` | Dark mint green shades |
| `Emrld` | Emerald green shades |
| `Magenta` | Magenta shades |
| `Mint` | Mint green shades |
| `OrYel` | Orange to yellow |
| `Peach` | Peach shades |
| `PinkYl` | Pink to yellow |
| `Purp` | Purple shades |
| `PurpOr` | Purple to orange |
| `RedOr` | Red to orange |
| `Sunset` | Sunset colors |
| `SunsetDark` | Dark sunset colors |
| `TealGrn` | Teal to green |

### Perceptually Uniform Schemes

These schemes maintain perceptual uniformity:

| Name | Description |
|------|-------------|
| `Viridis` | Purple to green to yellow |
| `Magma` | Black to purple to yellow |
| `Inferno` | Black to red to yellow |
| `Plasma` | Purple to pink to yellow |
| `Cool` | Cyan to magenta |
| `Warm` | Orange to pink to purple |

### Other Schemes

| Name | Description |
|------|-------------|
| `Grayish` | Light gray to dark blue-gray |

## Dark Mode Behavior

When `darkMode: true`, the color scheme is automatically reversed so that higher values appear brighter (lighter colors).

```typescript
// In dark mode, the scheme automatically inverts
new FlowmapLayer({
  darkMode: true,
  colorScheme: 'Teal',  // Higher flows will be lighter teal
  // ...
});

// In light mode, higher flows will be darker teal
new FlowmapLayer({
  darkMode: false,
  colorScheme: 'Teal',
  // ...
});
```

## Custom Color Schemes

Provide a custom array of colors:

```typescript
// Custom 7-color scheme
new FlowmapLayer({
  colorScheme: [
    '#f7fbff',  // Lowest values
    '#deebf7',
    '#c6dbef',
    '#9ecae1',
    '#6baed6',
    '#3182bd',
    '#08519c',  // Highest values
  ],
  // ...
});
```

### Color Format

Colors can be specified in any CSS color format:

```typescript
// Hex colors
colorScheme: ['#ffffff', '#000000']

// Named colors
colorScheme: ['white', 'black']

// RGB
colorScheme: ['rgb(255, 255, 255)', 'rgb(0, 0, 0)']

// RGBA (with transparency)
colorScheme: ['rgba(255, 255, 255, 0.5)', 'rgba(0, 0, 0, 1)']
```

### Recommended Number of Colors

For best results, provide 5-9 colors. The library interpolates between these colors to create smooth gradients.

## Fading Effects

The `fadeAmount` prop controls how much lower-magnitude flows fade:

```typescript
new FlowmapLayer({
  colorScheme: 'Teal',
  fadeAmount: 50,         // Default: moderate fading
  fadeEnabled: true,      // Enable color fading
  fadeOpacityEnabled: false,  // Also fade opacity (optional)
  // ...
});
```

| Prop | Default | Description |
|------|---------|-------------|
| `fadeAmount` | 50 | 0-100: How much lower flows fade (0 = no fade, 100 = maximum fade) |
| `fadeEnabled` | true | Whether to apply color fading |
| `fadeOpacityEnabled` | false | Whether to also fade opacity |

## Example: Comparing Schemes

```typescript
// Create multiple layers with different schemes
const schemes = ['Teal', 'Blues', 'Viridis', 'Sunset'];

schemes.forEach((scheme, index) => {
  const layer = new FlowmapLayer({
    id: `flowmap-${scheme}`,
    data,
    colorScheme: scheme,
    // Offset each layer for comparison
    // ...
  });
});
```

## Creating Brand Colors

Match your brand colors by creating a custom scheme:

```typescript
// Example: Using brand colors
const brandColors = [
  'rgba(240, 240, 240, 0.5)',  // Near white for lowest
  '#b3d4fc',                   // Light brand blue
  '#6699cc',                   // Medium brand blue
  '#336699',                   // Brand blue
  '#003366',                   // Dark brand blue for highest
];

new FlowmapLayer({
  colorScheme: brandColors,
  // ...
});
```

## Color Scheme Gallery

Here are some popular combinations:

### For Geographic/Nature Data

- `Teal` - Calm, water-like
- `Emrld` - Nature, environment
- `BluGrn` - Ocean currents, ecology

### For Business/Analytics

- `Blues` - Professional, neutral
- `Greys` - Minimal, understated
- `Grayish` - Corporate, formal

### For Impact/Attention

- `Reds` - Urgency, heat
- `Oranges` - Energy, activity
- `Sunset` - Dramatic, warm

### For Scientific Data

- `Viridis` - Perceptually uniform, colorblind-friendly
- `Plasma` - High contrast, scientific
- `Magma` - Heat maps, intensity
