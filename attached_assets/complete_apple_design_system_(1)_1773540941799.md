# Complete Apple Design System Guide
## Comprehensive Reference for iOS/macOS-Inspired Web Development

**Author:** Manus AI  
**Date:** January 27, 2026  
**Version:** 1.0  
**Purpose:** A complete guide combining research, principles, and implementation for building web applications following Apple's Human Interface Guidelines

---

## Table of Contents

1. [Introduction](#introduction)
2. [Core Design Principles](#core-design-principles)
3. [Liquid Glass Material System](#liquid-glass-material-system)
4. [Color System](#color-system)
5. [Typography](#typography)
6. [Layout and Spacing](#layout-and-spacing)
7. [Component Library](#component-library)
8. [Motion and Animation](#motion-and-animation)
9. [Accessibility](#accessibility)
10. [Implementation Guide](#implementation-guide)
11. [References](#references)

---

## Introduction

This document provides a comprehensive design system based on Apple's Human Interface Guidelines for iOS and macOS [1]. The goal is to create web applications that feel refined, intuitive, and consistent with modern design standards while maintaining the polish and attention to detail that characterizes Apple's design philosophy.

Apple's design language has evolved significantly with the introduction of **Liquid Glass** [6]—a dynamic material that unifies the design across all Apple platforms. This glassmorphism approach creates depth, layering, and visual hierarchy through translucency and blur effects, allowing content to remain visible beneath functional elements like navigation bars and toolbars.

### Why Follow Apple's Design Principles?

Apple has spent decades refining their design approach through extensive user research and iteration. Their Human Interface Guidelines represent best practices for creating intuitive, accessible, and beautiful interfaces. By following these principles, you benefit from:

**Familiarity:** Users already understand how Apple-style interfaces work, reducing the learning curve for your application.

**Consistency:** A unified design language across your application creates a professional, cohesive experience.

**Accessibility:** Apple's guidelines prioritize inclusive design, ensuring your application works for everyone.

**Quality:** The attention to detail in spacing, typography, and motion creates a polished, premium feel.

### How to Use This Document

This guide is organized into three main sections. The first section covers the foundational principles and research behind Apple's design approach. The second section provides detailed specifications for colors, typography, layout, and components. The third section offers practical implementation guidance with code examples you can use directly in your projects.

Whether you're building a new application from scratch or refining an existing one, use this document as your design system specification. All examples use modern web standards and are production-ready.

---

## Core Design Principles

Apple's design philosophy rests on three foundational principles that should guide every design decision [1].

### 1. Hierarchy

The principle of hierarchy establishes that controls and interface elements should elevate and distinguish the content beneath them. In Apple's design language, content is always the primary focus—user interface elements exist to enhance and frame the content, not to compete with it for attention.

This principle manifests in several ways throughout the interface. Size, weight, color, and positioning work together to create clear levels of importance that guide the user's eye naturally through the interface. The most important content appears largest and most prominent, while supporting elements recede into the background through reduced size, lighter weights, or more subtle colors.

The Liquid Glass material system reinforces this hierarchy by creating a distinct functional layer that floats above the content layer. Navigation bars, tab bars, and toolbars use the translucent glass effect to remain visible while allowing content to peek through from beneath, establishing a clear visual separation between controls and content.

### 2. Harmony

Harmony refers to the alignment between hardware and software design, creating a concentric relationship where interface elements, system experiences, and devices work together seamlessly. This principle ensures that your design feels cohesive and unified, with elements that complement rather than conflict with one another.

Achieving harmony requires considering how different parts of your interface relate to one another and to the overall experience. Colors should work together to create a cohesive palette. Spacing should follow a consistent scale. Typography should establish a clear hierarchy. Motion should feel natural and purposeful. When all these elements align, the result is an interface that feels carefully crafted and intentional.

Harmony also extends to how your application adapts across different contexts. The same design language should feel appropriate whether viewed on a small phone screen or a large desktop display, in bright sunlight or a dark room, with touch input or a mouse and keyboard.

### 3. Consistency

Consistency means adopting platform conventions to maintain a design that continuously adapts across window sizes and displays while remaining recognizably familiar. Users should feel immediately comfortable with your interface because it follows expected patterns and behaviors.

This principle reduces cognitive load by allowing users to apply knowledge from other applications to yours. When a button looks clickable, it should be clickable. When text appears in a certain color, it should consistently indicate the same type of information. When an interaction produces a certain result in one part of your application, it should produce the same result elsewhere.

Consistency doesn't mean rigidity—your application should still have its own personality and brand identity. Rather, it means that the fundamental interaction patterns, visual language, and information architecture follow conventions that users already understand. This allows them to focus on their tasks rather than learning new interaction models.

---

## Liquid Glass Material System

Liquid Glass is Apple's dynamic material that unifies the design language across all platforms [2] [6]. Introduced in 2025, it represents a significant evolution in how interfaces create depth and hierarchy through translucency and blur effects.

### Understanding the Material Philosophy

Materials in interface design create a sense of depth, layering, and hierarchy between foreground and background elements [2]. They help visually separate functional elements (such as text and controls) from content elements (such as images and data). By allowing color and content to pass through from background to foreground, materials establish visual hierarchy that helps users maintain a sense of place within the interface.

Apple platforms feature two types of materials: Liquid Glass and standard materials. Liquid Glass is the dynamic material used for controls and navigation, while standard materials provide visual differentiation within the content layer beneath.

### The Two-Layer Model

Your interface should be organized into two distinct conceptual layers, each with its own purpose and visual treatment.

**Functional Layer (Controls & Navigation):** This layer floats above the content and uses Liquid Glass effects. It includes navigation bars, tab bars, sidebars, toolbars, and interactive controls. The Liquid Glass material allows content to scroll and peek through from beneath these elements, giving the interface a sense of dynamism and depth while maintaining legibility for controls and navigation [2].

**Content Layer (Main Content):** This layer sits beneath the functional layer and contains the primary content users interact with—text, images, videos, data visualizations, articles, and other information. Use standard materials (subtle backgrounds, cards with soft shadows) for visual distinction within this layer, but avoid Liquid Glass effects here to prevent unnecessary complexity and maintain clear visual hierarchy [2].

### Two Variants of Liquid Glass

Liquid Glass provides two variants that you can choose when building custom components or styling system components [2]. The appearance of these variants can differ in response to system settings, such as user preferences for transparency or accessibility settings that increase contrast.

**Regular Variant:** This variant blurs and adjusts the luminosity of background content to maintain legibility of text and other foreground elements. Scroll edge effects further enhance legibility by blurring and reducing the opacity of background content as it approaches the edges of the glass element. Most system components use this variant.

Use the regular variant when background content might create legibility issues, or when components have a significant amount of text. This makes it ideal for alerts, sidebars, popovers, navigation bars, and any interface element where reading text is the primary interaction.

**Clear Variant:** This variant is highly translucent, prioritizing the visibility of the underlying content and ensuring visually rich background elements remain prominent. Use this variant for components that float above media backgrounds—such as photos and videos—to create a more immersive content experience.

For optimal contrast and legibility when using the clear variant, determine whether to add a dimming layer behind the glass component. If the underlying content is bright, consider adding a dark dimming layer of 35% opacity [2]. If the underlying content is sufficiently dark, or if you're using standard media playback controls that provide their own dimming layer, you don't need to apply additional dimming.

### Implementing Glassmorphism in CSS

To achieve the Liquid Glass effect in web applications, use CSS backdrop filters combined with semi-transparent backgrounds and subtle borders. The key properties are `backdrop-filter` for the blur effect and a semi-transparent background color.

**Basic Liquid Glass Effect:**
```css
.glass-effect {
  background: rgba(255, 255, 255, 0.7); /* Semi-transparent white for light mode */
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
}

/* Dark mode variant */
@media (prefers-color-scheme: dark) {
  .glass-effect {
    background: rgba(30, 30, 30, 0.7); /* Semi-transparent dark */
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}
```

**Regular Variant (for text-heavy components):**
```css
.glass-regular {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  .glass-regular {
    background: rgba(40, 40, 40, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.15);
  }
}
```

**Clear Variant (for media backgrounds):**
```css
.glass-clear {
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(30px) saturate(200%);
  -webkit-backdrop-filter: blur(30px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Optional dimming layer for bright backgrounds */
.glass-clear-with-dimming::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: -1;
  border-radius: inherit;
}

@media (prefers-color-scheme: dark) {
  .glass-clear {
    background: rgba(20, 20, 20, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}
```

### Usage Guidelines

Understanding when and where to apply Liquid Glass is crucial for maintaining proper visual hierarchy and avoiding interface complexity.

**DO Use Liquid Glass For:**
- Navigation bars and headers that remain visible while content scrolls beneath
- Tab bars and bottom navigation that float above content
- Sidebars and drawers that overlay the main content area
- Toolbars and action bars that contain primary controls
- Modal dialogs and popovers that appear above other interface elements
- Floating action buttons or control panels that need to remain accessible

**DON'T Use Liquid Glass For:**
- Content cards or panels within the main content area
- Background surfaces or page containers
- List items or table rows in the content layer
- Text blocks or article content
- Static images or media elements
- Multiple overlapping custom controls (creates visual confusion)

**Exception:** Controls in the content layer with transient interactive elements—such as sliders and toggles—can take on a Liquid Glass appearance to emphasize their interactivity when a user activates them [2].

**Use Sparingly:** Standard components from system frameworks automatically pick up the Liquid Glass appearance and behavior. If you apply Liquid Glass effects to custom controls, do so sparingly. Liquid Glass seeks to bring attention to the underlying content, and overusing this material in multiple custom controls can provide a subpar user experience by distracting from that content [2]. Limit these effects to the most important functional elements in your application.

### Standard Materials for Content Layer

In addition to Liquid Glass, use standard materials to create visual distinction within the content layer [2]. These materials use varying levels of translucency to provide subtle differentiation without the prominent glass effect.

| Material Thickness | Translucency Level | Opacity | Best Use Case |
|-------------------|-------------------|---------|---------------|
| Ultra-thin | Highest | ~10% | Subtle overlays, very light backgrounds, minimal separation |
| Thin | High | ~20% | Secondary panels, grouped content, light cards |
| Regular | Balanced | ~40% | Default cards, panels, modals, standard backgrounds |
| Thick | Low | ~60% | Prominent cards, high-contrast sections, important containers |

**Implementation:**
```css
.material-ultra-thin {
  background: rgba(242, 242, 247, 0.1);
  backdrop-filter: blur(10px);
}

.material-thin {
  background: rgba(242, 242, 247, 0.2);
  backdrop-filter: blur(12px);
}

.material-regular {
  background: rgba(242, 242, 247, 0.4);
  backdrop-filter: blur(16px);
}

.material-thick {
  background: rgba(242, 242, 247, 0.6);
  backdrop-filter: blur(20px);
}

@media (prefers-color-scheme: dark) {
  .material-ultra-thin { background: rgba(28, 28, 30, 0.1); }
  .material-thin { background: rgba(28, 28, 30, 0.2); }
  .material-regular { background: rgba(28, 28, 30, 0.4); }
  .material-thick { background: rgba(28, 28, 30, 0.6); }
}
```

Thicker materials provide better contrast for text and elements with fine features, making them suitable for components where readability is paramount. Thinner materials help users retain context by providing a visible reminder of the content in the background, making them ideal for temporary overlays or secondary information panels.

### Vibrancy and Legibility

When using materials, especially Liquid Glass, ensure legibility by using vibrant colors on top of them [2]. System-defined vibrant colors automatically adjust to maintain proper contrast regardless of the material beneath them. Avoid using standard colors like `systemGray3` directly on materials, as they may not provide sufficient contrast.

Choose materials and effects based on semantic meaning and recommended usage, not on the apparent color they impart to your interface. System settings can change a material's appearance and behavior, so matching the material to your specific use case ensures consistent results across different contexts [2].

---

## Color System

Apple's color system is built on semantic meaning, automatic adaptation, and accessibility [3]. Colors are defined by their purpose rather than their appearance, allowing them to adapt appropriately to different contexts while maintaining their intended function.

### Color Philosophy

The system defines colors that look good on various backgrounds and appearance modes, and can automatically adapt to vibrancy and accessibility settings [3]. Using system colors provides a convenient way to make your experience feel at home on the device, as these colors already define variants for light mode, dark mode, and increased contrast contexts.

Judicious use of color enhances communication, evokes your brand, provides visual continuity, communicates status and feedback, and helps people understand information. However, color should never be the sole means of conveying information—always provide alternative cues for users with color blindness or other visual disabilities.

### Semantic Color Roles

Define colors based on their semantic role in the interface rather than their visual appearance. This approach allows colors to adapt to different contexts (light mode, dark mode, increased contrast) while maintaining their meaning and purpose.

| Color Role | Purpose | Example Usage |
|-----------|---------|---------------|
| Primary | Main brand color, primary actions, key interactive elements | Primary buttons, active links, selected states, brand accents |
| Secondary | Supporting actions, less prominent interactive elements | Secondary buttons, tags, badges, alternative actions |
| Accent | Highlight important information, draw attention | Notifications, special callouts, success confirmations, featured content |
| Background | Main canvas color, foundational surface | Page background, app background, full-screen containers |
| Surface | Elevated elements above background, secondary surfaces | Cards, panels, modals, elevated containers |
| Text Primary | Main text content, highest contrast | Headings, body text, labels, primary information |
| Text Secondary | Supporting text, medium contrast | Captions, helper text, timestamps, secondary information |
| Text Tertiary | Least prominent text, lowest contrast | Placeholders, disabled text, tertiary information |
| Border | Dividers and outlines, subtle separation | Card borders, separators, input outlines, dividing lines |
| Error | Error states and destructive actions | Error messages, delete buttons, warning indicators, failed states |
| Warning | Warning states, caution indicators | Warning messages, caution alerts, attention-needed states |
| Success | Success states and confirmations | Success messages, completion indicators, positive feedback |

### Light and Dark Mode Implementation

Every color must have both a light and dark mode variant [3]. System colors vary subtly depending on the system appearance, adjusting to ensure proper color differentiation and contrast for text, symbols, and other elements. With the Increase Contrast setting turned on, the color differences become far more apparent.

Even if your application ships in a single appearance mode, provide both light and dark colors to support Liquid Glass adaptivity in these contexts [3]. This ensures that your interface remains legible and visually coherent when displayed on glass materials that adapt to their surroundings.

**Light Mode Color Palette:**
```css
:root {
  /* Brand Colors */
  --color-primary: #007AFF; /* Apple blue */
  --color-secondary: #5856D6; /* Purple */
  --color-accent: #FF9500; /* Orange */
  
  /* Background Colors */
  --color-background: #FFFFFF;
  --color-surface: #F2F2F7;
  --color-surface-secondary: #E5E5EA;
  
  /* Text Colors */
  --color-text-primary: #000000;
  --color-text-secondary: #3C3C43;
  --color-text-tertiary: #3C3C4399; /* 60% opacity */
  
  /* Border Colors */
  --color-border: rgba(60, 60, 67, 0.18);
  --color-border-strong: rgba(60, 60, 67, 0.36);
  
  /* Semantic Colors */
  --color-error: #FF3B30;
  --color-warning: #FF9500;
  --color-success: #34C759;
}
```

**Dark Mode Color Palette:**
```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Brand Colors - Brighter for dark backgrounds */
    --color-primary: #0A84FF;
    --color-secondary: #5E5CE6;
    --color-accent: #FF9F0A;
    
    /* Background Colors */
    --color-background: #000000;
    --color-surface: #1C1C1E;
    --color-surface-secondary: #2C2C2E;
    
    /* Text Colors */
    --color-text-primary: #FFFFFF;
    --color-text-secondary: #EBEBF5;
    --color-text-tertiary: #EBEBF599; /* 60% opacity */
    
    /* Border Colors */
    --color-border: rgba(235, 235, 245, 0.18);
    --color-border-strong: rgba(235, 235, 245, 0.36);
    
    /* Semantic Colors - Adjusted for dark backgrounds */
    --color-error: #FF453A;
    --color-warning: #FF9F0A;
    --color-success: #32D74B;
  }
}
```

### Color Best Practices

**Consistency in Usage:** Avoid using the same color to mean different things [3]. Use color consistently throughout your interface, especially when you use it to help communicate information like status or interactivity. For example, if you use your brand color to indicate that a borderless button is interactive, using the same or similar color to stylize noninteractive text is confusing.

**Accessibility and Contrast:** Avoid relying solely on color to differentiate between objects, indicate interactivity, or communicate essential information [3]. When you use color to convey information, be sure to provide the same information in alternative ways so people with color blindness or other visual disabilities can understand it. For example, use text labels or glyph shapes to identify objects or states.

Avoid using colors that make it hard to perceive content in your application [3]. Insufficient contrast can cause icons and text to blend with the background and make content hard to read. Ensure sufficient contrast between foreground and background colors:
- Normal text (< 18px): Minimum 4.5:1 contrast ratio
- Large text (≥ 18px or ≥ 14px bold): Minimum 3:1 contrast ratio
- UI components and graphics: Minimum 3:1 contrast ratio

**Never Hardcode Color Values:** Avoid hard-coding system color values in your app [3]. Documented color values are for your reference during the app design process. The actual color values may fluctuate from release to release, based on a variety of environmental variables. Use CSS custom properties (variables) for all colors to enable easy theme switching and ensure consistency.

**Respect Semantic Meanings:** Avoid redefining the semantic meanings of dynamic system colors [3]. To ensure a consistent experience and ensure your interface looks great when the appearance of the platform changes, use dynamic system colors as intended. For example, don't use the separator color as a text color, or secondary text label color as a background color.

**Cultural Considerations:** Consider how the colors you use might be perceived in other countries and cultures [3]. For example, red communicates danger in some cultures, but has positive connotations in other cultures. Make sure the colors in your app send the message you intend.

### Wide Color Support

Wide color displays support a P3 color space, which can produce richer, more saturated colors than sRGB [3]. Photos and videos that use wide color are more lifelike, and visual data and status indicators that use wide color can be more meaningful. When appropriate, use the Display P3 color profile at 16 bits per pixel (per channel) and export images in PNG format.

In general, P3 colors and images appear fine on sRGB displays. Occasionally, it may be hard to distinguish two very similar P3 colors when viewing them on an sRGB display. Gradients that use P3 colors can also sometimes appear clipped on sRGB displays [3]. To avoid these issues and ensure visual fidelity on both wide color and sRGB displays, you can provide different versions of images and colors for each color space.

**CSS Implementation:**
```css
.vibrant-element {
  /* sRGB fallback */
  background-color: rgb(255, 0, 100);
  
  /* P3 color for wide-gamut displays */
  background-color: color(display-p3 1 0 0.4);
}
```

---

## Typography

Typography is fundamental to creating a clear, legible, and hierarchical interface [4]. Your typographic choices help you display legible text, convey an information hierarchy, communicate important content, and express your brand or style.

### Font Selection for Web

For web applications, use system font stacks that leverage the native fonts on each platform. This ensures optimal rendering, performance, and familiarity for users. The system font automatically adjusts for optimal legibility at every size and provides Dynamic Type support.

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
               "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

This font stack provides:
- **San Francisco** on macOS and iOS (Apple's custom system font)
- **Segoe UI** on Windows
- **Roboto** on Android
- **Helvetica Neue** and **Arial** as fallbacks on older systems

### Text Style Hierarchy

Define a clear hierarchy of text styles that establish the relative importance of content [4]. Each style should have a specific purpose and consistent application throughout your interface. The system-defined text styles give you a convenient and consistent way to convey your information hierarchy through font size and weight.

| Style | Size | Weight | Line Height | Letter Spacing | Usage |
|-------|------|--------|-------------|----------------|-------|
| Large Title | 34px | Bold (700) | 41px (1.21) | 0.37px | Page titles, hero headings, primary screen titles |
| Title 1 | 28px | Bold (700) | 34px (1.21) | 0.36px | Section titles, major headings |
| Title 2 | 22px | Bold (700) | 28px (1.27) | 0.35px | Subsection titles, secondary headings |
| Title 3 | 20px | Semibold (600) | 25px (1.25) | 0.38px | Card titles, group headings, tertiary headings |
| Headline | 17px | Semibold (600) | 22px (1.29) | -0.43px | Emphasized content, list headers, callouts |
| Body | 17px | Regular (400) | 22px (1.29) | -0.43px | Primary content, paragraphs, main text |
| Callout | 16px | Regular (400) | 21px (1.31) | -0.31px | Secondary content, supporting information |
| Subheadline | 15px | Regular (400) | 20px (1.33) | -0.23px | Supporting text, metadata |
| Footnote | 13px | Regular (400) | 18px (1.38) | -0.08px | Captions, timestamps, small labels |
| Caption 1 | 12px | Regular (400) | 16px (1.33) | 0px | Small labels, metadata, tags |
| Caption 2 | 11px | Regular (400) | 13px (1.18) | 0.06px | Smallest text, fine print, legal text |

**CSS Implementation:**
```css
:root {
  /* Font Sizes */
  --font-size-large-title: 34px;
  --font-size-title-1: 28px;
  --font-size-title-2: 22px;
  --font-size-title-3: 20px;
  --font-size-headline: 17px;
  --font-size-body: 17px;
  --font-size-callout: 16px;
  --font-size-subheadline: 15px;
  --font-size-footnote: 13px;
  --font-size-caption-1: 12px;
  --font-size-caption-2: 11px;
  
  /* Font Weights */
  --font-weight-bold: 700;
  --font-weight-semibold: 600;
  --font-weight-medium: 500;
  --font-weight-regular: 400;
  
  /* Line Heights */
  --line-height-tight: 1.2;
  --line-height-normal: 1.4;
  --line-height-relaxed: 1.6;
}

/* Text Style Classes */
.text-large-title {
  font-size: var(--font-size-large-title);
  font-weight: var(--font-weight-bold);
  line-height: 1.21;
  letter-spacing: 0.37px;
}

.text-title-1 {
  font-size: var(--font-size-title-1);
  font-weight: var(--font-weight-bold);
  line-height: 1.21;
  letter-spacing: 0.36px;
}

.text-body {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-regular);
  line-height: 1.29;
  letter-spacing: -0.43px;
}

/* Continue for all text styles... */
```

### Font Weight Guidelines

In general, avoid light font weights [4]. For example, if you're using system-provided fonts, prefer Regular (400), Medium (500), Semibold (600), or Bold (700) font weights, and avoid Ultralight (100), Thin (200), and Light (300) font weights, which can be difficult to see, especially when text is small.

Font weight impacts how easy text is to read. If you use a custom font with a thin weight, aim for larger than the recommended sizes to increase legibility. Adjust font weight, size, and color as needed to emphasize important information and help people visualize hierarchy, but be sure to maintain the relative hierarchy and visual distinction of text elements when people adjust text sizes [4].

### Leading (Line Height) Adjustments

Modify the built-in text styles if necessary using symbolic traits [4]. System APIs define font adjustments that let you modify some aspects of a text style. For example, you can use symbolic traits to adjust leading if you need to improve readability or conserve space.

**Loose Leading (1.6-1.8):** When you display text in wide columns or long passages, more space between lines can make it easier for people to keep their place while moving from one line to the next [4]. Use loose leading for:
- Long-form articles or blog posts
- Wide text columns (> 80 characters per line)
- Dense informational content
- Reading-focused interfaces

**Standard Leading (1.4-1.5):** Use for most body text and UI elements. This provides a comfortable reading experience without wasting space. Appropriate for:
- Standard body text and paragraphs
- UI labels and descriptions
- Cards and panels
- Most interface text

**Tight Leading (1.2-1.3):** If you need to display multiple lines of text in an area where height is constrained—for example, in a list row—decreasing the space between lines can help the text fit well [4]. However, if you need to display three or more lines of text, avoid tight leading even in areas where height is limited. Use tight leading only for:
- Headlines and titles (1-2 lines)
- Compact list items with limited height
- Space-constrained UI elements
- Never for three or more lines of body text

### Responsive Typography (Dynamic Type)

Support Dynamic Type by allowing users to adjust text sizes based on their preferences [4]. People appreciate apps that respond when they choose a different text size. Use relative units (rem, em) instead of fixed pixel values for font sizes to enable proportional scaling.

```css
:root {
  --font-size-base: 16px;
}

html {
  font-size: var(--font-size-base);
}

/* Use rem units for scalability */
.text-body {
  font-size: 1.0625rem; /* 17px at base size */
}

.text-title-1 {
  font-size: 1.75rem; /* 28px at base size */
}

/* Respond to user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

When users adjust their preferred text size, your interface should scale proportionally while maintaining hierarchy and layout integrity. Test your interface at different text sizes (100%, 125%, 150%, 200%) to ensure layouts don't break and content remains accessible.

---

## Layout and Spacing

A well-structured layout creates visual harmony and guides users through your interface naturally [5]. A consistent layout that adapts to various contexts makes your experience more approachable and helps people enjoy their favorite apps and games on all their devices.

### Spacing Scale

Use a consistent spacing scale based on multiples of 4px or 8px. This creates visual rhythm and makes your interface feel cohesive. The spacing scale should be used for padding, margins, gaps, and positioning throughout your interface.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight spacing, icon padding, minimal gaps |
| sm | 8px | Compact spacing, small gaps between related items |
| md | 16px | Standard spacing, default gaps between elements |
| lg | 24px | Comfortable spacing, section gaps, card padding |
| xl | 32px | Generous spacing, major sections, prominent cards |
| 2xl | 48px | Large spacing, page sections, hero areas |
| 3xl | 64px | Extra large spacing, major page divisions |
| 4xl | 96px | Massive spacing, full-page sections |

```css
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --spacing-3xl: 64px;
  --spacing-4xl: 96px;
}

/* Usage examples */
.card {
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.section {
  padding-top: var(--spacing-3xl);
  padding-bottom: var(--spacing-3xl);
}
```

### Layout Principles

**Content First:** Extend content to fill the screen or window [5]. Make sure backgrounds and full-screen artwork extend to the edges of the display. Also ensure that scrollable layouts continue all the way to the bottom and the sides of the device screen. Controls and navigation components like sidebars and tab bars appear on top of content rather than on the same plane, so it's important for your layout to take this into account.

**Grouping and Organization:** Group related items to help people find the information they want [5]. For example, you might use negative space, background shapes, colors, materials, or separator lines to show when elements are related and to separate information into distinct areas. When you do so, ensure that content and controls remain clearly distinct.

**Information Hierarchy:** Make essential information easy to find by giving it sufficient space [5]. People want to view the most important information right away, so don't obscure it by crowding it with nonessential details. You can make secondary information available in other parts of the window, or include it in an additional view.

**Alignment:** Align components with one another to make them easier to scan and to communicate organization and hierarchy [5]. Alignment makes an app look neat and organized and can help people track content while scrolling or moving their eyes, making it easier to find information. Along with indentation, alignment can also help people understand an information hierarchy.

**Progressive Disclosure:** Take advantage of progressive disclosure to help people discover content that's currently hidden [5]. For example, if you can't display all the items in a large collection at once, you need to indicate that there are additional items that aren't currently visible. Depending on the platform, you might use a disclosure control, or display parts of items to hint that people can reveal additional content by interacting with the view, such as by scrolling.

**Control Spacing:** Make controls easier to use by providing enough space around them and grouping them in logical sections [5]. If unrelated controls are too close together—or if other content crowds them—they can be difficult for people to tell apart or understand what they do, which can make your app or game hard to use.

### Visual Hierarchy

**Differentiate Controls from Content:** Take advantage of the Liquid Glass material to provide a distinct appearance for controls that's consistent across iOS, iPadOS, and macOS [5]. Instead of a background, use a scroll edge effect to provide a transition between content and the control area.

**Placement for Importance:** Place items to convey their relative importance [5]. People often start by viewing items in reading order—that is, from top to bottom and from the leading to trailing side—so it generally works well to place the most important items near the top and leading side of the window, display, or field of view. Be aware that reading order varies by language, and take right to left languages into account as you design.

### Responsive Breakpoints

Design for adaptability across different screen sizes [5]. Every app and game needs to adapt when the device or system context changes. Use these breakpoints as a starting point, but adjust based on your content's needs:

| Breakpoint | Width | Target Devices | Columns | Margin |
|-----------|-------|----------------|---------|--------|
| Mobile | < 640px | Phones | 4 | 16px |
| Tablet | 640px - 1024px | Tablets, small laptops | 8 | 24px |
| Desktop | 1024px - 1440px | Laptops, desktops | 12 | 32px |
| Large | > 1440px | Large desktops, external displays | 12 | 48px |

```css
/* Mobile-first approach */
.container {
  padding: var(--spacing-md);
  max-width: 100%;
}

/* Tablet and up */
@media (min-width: 640px) {
  .container {
    padding: var(--spacing-lg);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .container {
    padding: var(--spacing-xl);
    max-width: 1200px;
    margin: 0 auto;
  }
}

/* Large screens */
@media (min-width: 1440px) {
  .container {
    max-width: 1440px;
    padding: var(--spacing-2xl);
  }
}
```

### Safe Areas and Margins

Respect system-defined safe areas to ensure your content isn't obscured by device features like notches, rounded corners, or home indicators [5]. Use CSS environment variables to access safe area insets:

```css
.app-container {
  padding-top: max(var(--spacing-md), env(safe-area-inset-top));
  padding-right: max(var(--spacing-md), env(safe-area-inset-right));
  padding-bottom: max(var(--spacing-md), env(safe-area-inset-bottom));
  padding-left: max(var(--spacing-md), env(safe-area-inset-left));
}
```

### Adaptability Guidelines

Design a layout that adapts gracefully to context changes while remaining recognizably consistent [5]. People expect your experience to work well and remain familiar when they rotate their device, resize a window, add another display, or switch to a different device. Here are some of the most common device and system variations you need to handle:

- Different device screen sizes, resolutions, and color spaces
- Different device orientations (portrait/landscape)
- System features like Dynamic Island and camera controls
- External display support, Display Zoom, and resizable windows on iPad
- Dynamic Type text-size changes
- Locale-based internationalization features like left-to-right/right-to-left layout direction, date/time/number formatting, font variation, and text length

Preview your app on multiple devices, using different orientations, localizations, and text sizes [5]. You can streamline the testing process by first testing versions of your experience that use the largest and the smallest layouts. When necessary, scale artwork in response to display changes, but don't change the aspect ratio—instead, scale it so that important visual content remains visible.

---

## Component Library

This section provides ready-to-use CSS implementations for common interface components following Apple's design principles.

### Buttons

Buttons are the primary way users take action in your interface. They should be immediately recognizable and clearly indicate their purpose through size, color, and placement.

**Primary Button (Filled):**
```css
.button-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: white;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 17px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.2);
}

.button-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 122, 255, 0.3);
}

.button-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 122, 255, 0.2);
}

.button-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

**Secondary Button (Outlined):**
```css
.button-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--color-primary);
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 17px;
  font-weight: 600;
  border: 2px solid var(--color-primary);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.button-secondary:hover {
  background: var(--color-primary);
  color: white;
}

.button-secondary:active {
  transform: scale(0.98);
}
```

**Tertiary Button (Text Only):**
```css
.button-tertiary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--color-primary);
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 17px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.button-tertiary:hover {
  background: rgba(0, 122, 255, 0.1);
}

.button-tertiary:active {
  background: rgba(0, 122, 255, 0.2);
}
```

### Cards

Cards contain related information and actions. They should feel elevated above the background and use subtle shadows to create depth.

```css
.card {
  background: var(--color-surface);
  border-radius: 16px;
  padding: var(--spacing-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--color-border);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-interactive {
  cursor: pointer;
}

.card-interactive:active {
  transform: translateY(-2px);
}

/* Card with glass effect */
.card-glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

@media (prefers-color-scheme: dark) {
  .card-glass {
    background: rgba(30, 30, 30, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}
```

### Input Fields

Input fields should be clear, accessible, and provide helpful feedback.

```css
.input {
  width: 100%;
  padding: 12px 16px;
  font-size: 17px;
  font-family: inherit;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
}

.input::placeholder {
  color: var(--color-text-tertiary);
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Input with label */
.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.input-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.input-helper {
  font-size: 13px;
  color: var(--color-text-tertiary);
}

.input-error {
  border-color: var(--color-error);
}

.input-error:focus {
  box-shadow: 0 0 0 4px rgba(255, 59, 48, 0.1);
}
```

### Navigation Bar (with Liquid Glass)

```css
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding: var(--spacing-md) var(--spacing-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
}

@media (prefers-color-scheme: dark) {
  .navbar {
    background: rgba(30, 30, 30, 0.7);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.navbar-brand {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-decoration: none;
}

.navbar-nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  list-style: none;
  margin: 0;
  padding: 0;
}

.navbar-link {
  color: var(--color-text-primary);
  text-decoration: none;
  font-size: 17px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background 0.2s;
}

.navbar-link:hover {
  background: rgba(0, 0, 0, 0.05);
}

.navbar-link.active {
  color: var(--color-primary);
  background: rgba(0, 122, 255, 0.1);
}

@media (prefers-color-scheme: dark) {
  .navbar-link:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}
```

### Modal Dialog

```css
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  z-index: 1000;
  animation: fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal {
  background: var(--color-surface);
  border-radius: 20px;
  padding: var(--spacing-xl);
  max-width: 500px;
  width: 100%;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-lg);
}

.modal-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.modal-close {
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  transition: background 0.2s;
}

.modal-close:hover {
  background: rgba(0, 0, 0, 0.05);
}

.modal-body {
  color: var(--color-text-secondary);
  font-size: 17px;
  line-height: 1.5;
  margin-bottom: var(--spacing-lg);
}

.modal-footer {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Toggle Switch

```css
.toggle {
  position: relative;
  display: inline-block;
  width: 51px;
  height: 31px;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-border-strong);
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 31px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 27px;
  width: 27px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-input:checked + .toggle-slider {
  background-color: var(--color-primary);
}

.toggle-input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.toggle-input:focus + .toggle-slider {
  box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
}

.toggle-input:disabled + .toggle-slider {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## Motion and Animation

Subtle, purposeful animations enhance the user experience by providing feedback, guiding attention, and creating a sense of polish. However, animations should always serve a purpose and never distract from the primary content or task.

### Animation Principles

**Purposeful:** Every animation should have a clear purpose—providing feedback, guiding attention, or indicating state changes. Avoid animation for its own sake. Users should understand why something is moving and what it communicates about the interface state.

**Subtle:** Animations should be noticeable but not distracting. They should feel natural and enhance the experience rather than calling attention to themselves. The best animations are those that users don't consciously notice but that make the interface feel more responsive and alive.

**Fast:** Keep animations quick—typically between 200-400ms. Longer animations can make the interface feel sluggish and unresponsive. Shorter animations feel snappier and more immediate, which is especially important for frequently-used interactions.

**Easing:** Use natural easing functions that mimic real-world physics. Avoid linear animations, which feel mechanical and unnatural. Objects in the real world don't move at constant speeds—they accelerate and decelerate, and your animations should too.

### Standard Timing Functions

```css
:root {
  /* Standard easing curves */
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  /* Standard durations */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
}
```

### Common Animation Patterns

**Hover Effects:**
```css
.interactive-element {
  transition: transform var(--duration-fast) var(--ease-out), 
              box-shadow var(--duration-fast) var(--ease-out),
              background var(--duration-fast) var(--ease-out);
}

.interactive-element:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.interactive-element:active {
  transform: translateY(0);
  transition-duration: 50ms;
}
```

**Loading States:**
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.loading {
  animation: pulse 2s var(--ease-in-out) infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

**Fade In:**
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn var(--duration-normal) var(--ease-out);
}
```

**Scale In:**
```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.scale-in {
  animation: scaleIn var(--duration-normal) var(--ease-out);
}
```

**Slide In:**
```css
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.slide-in-right {
  animation: slideInRight var(--duration-normal) var(--ease-out);
}
```

### Respecting User Preferences

Always respect user preferences for reduced motion. Some users experience discomfort or motion sickness from animations, and accessibility guidelines require providing alternatives.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Accessibility

Accessible design ensures your application is usable by everyone, regardless of their abilities. Apple's Human Interface Guidelines place strong emphasis on inclusive design, and following these principles benefits all users, not just those with disabilities.

### Contrast Requirements

Ensure sufficient contrast between text and background colors to maintain legibility for users with visual impairments or in challenging viewing conditions:

- **Normal text (< 18px):** Minimum 4.5:1 contrast ratio
- **Large text (≥ 18px or ≥ 14px bold):** Minimum 3:1 contrast ratio
- **UI components and graphics:** Minimum 3:1 contrast ratio

Use tools like WebAIM's Contrast Checker or browser developer tools to verify your color combinations meet these standards. Remember that contrast requirements apply to all states of an element—default, hover, focus, and disabled.

```css
/* Good contrast example */
.text-on-light {
  color: #000000; /* Black on white = 21:1 ratio */
  background: #FFFFFF;
}

.text-on-dark {
  color: #FFFFFF; /* White on black = 21:1 ratio */
  background: #000000;
}

/* Insufficient contrast - avoid */
.poor-contrast {
  color: #999999; /* Gray on white = 2.8:1 - fails WCAG AA */
  background: #FFFFFF;
}
```

### Keyboard Navigation

All interactive elements must be accessible via keyboard. Many users rely on keyboard navigation due to motor disabilities, preference, or efficiency. Ensure your interface supports standard keyboard interactions:

- Use semantic HTML elements (`<button>`, `<a>`, `<input>`) which are keyboard-accessible by default
- Ensure a logical tab order with the `tabindex` attribute when necessary (avoid positive values)
- Provide visible focus indicators for all interactive elements
- Support standard keyboard shortcuts (Enter to activate, Escape to cancel, Arrow keys for navigation, Space for selection)

```css
/* Visible focus indicator - required for accessibility */
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Remove default outline only when providing custom focus styles */
*:focus {
  outline: none;
}

/* Ensure focus indicators are visible in all contexts */
@media (prefers-color-scheme: dark) {
  *:focus-visible {
    outline-color: var(--color-primary);
  }
}
```

### Screen Reader Support

Make your application understandable to screen reader users by providing semantic structure and descriptive labels:

- Use semantic HTML5 elements (`<nav>`, `<main>`, `<article>`, `<section>`, `<header>`, `<footer>`)
- Provide descriptive `alt` text for all images that convey information
- Use ARIA labels when semantic HTML isn't sufficient
- Ensure form inputs have associated `<label>` elements
- Provide skip links to bypass repetitive content
- Use ARIA live regions for dynamic content updates

```html
<!-- Good semantic structure -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>

<main>
  <article>
    <header>
      <h1>Article Title</h1>
      <p class="meta">Published on <time datetime="2026-01-27">January 27, 2026</time></p>
    </header>
    <p>Article content...</p>
  </article>
</main>

<!-- Skip link for keyboard users -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- Descriptive alt text -->
<img src="chart.png" alt="Bar chart showing 25% increase in sales from Q3 to Q4">

<!-- Form with proper labeling -->
<form>
  <div class="input-group">
    <label for="email">Email Address</label>
    <input type="email" id="email" name="email" required 
           aria-describedby="email-help">
    <span id="email-help" class="input-helper">
      We'll never share your email with anyone else.
    </span>
  </div>
</form>

<!-- ARIA live region for dynamic updates -->
<div role="status" aria-live="polite" aria-atomic="true">
  <p>3 new messages received</p>
</div>
```

### Responsive Text Sizing

Support user preferences for text size by using relative units and testing at different scales:

- Use relative units (rem, em) for font sizes instead of fixed pixels
- Test your interface at different text sizes (100%, 125%, 150%, 200%)
- Ensure layouts don't break when text size increases
- Allow horizontal scrolling if necessary, but avoid requiring it for primary content
- Maintain hierarchy and readability at all text sizes

```css
/* Use rem for scalability */
html {
  font-size: 16px; /* Base size */
}

body {
  font-size: 1rem; /* 16px */
}

h1 {
  font-size: 2.125rem; /* 34px */
}

.text-body {
  font-size: 1.0625rem; /* 17px */
}

/* Ensure containers can accommodate larger text */
.card {
  min-height: auto; /* Allow height to grow with content */
  padding: clamp(1rem, 2vw, 1.5rem); /* Responsive padding */
}
```

### Touch Target Sizes

Ensure interactive elements are large enough to be easily tapped on touch devices:

- Minimum touch target size: 44x44 pixels (iOS) or 48x48 pixels (Android)
- Provide adequate spacing between touch targets (at least 8px)
- Consider that users may have motor impairments or be using the interface in challenging conditions

```css
/* Ensure minimum touch target size */
.button,
.link,
.interactive {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Add padding to increase touch area without affecting visual size */
.icon-button {
  padding: 12px; /* Creates 44px touch target for 20px icon */
}
```

---

## Implementation Guide

This section provides a step-by-step guide for implementing this design system in your web application.

### Step 1: Set Up CSS Custom Properties

Create a CSS file (e.g., `design-system.css`) with all your design tokens defined as custom properties. This makes it easy to maintain consistency and switch themes.

```css
:root {
  /* Colors - Light Mode */
  --color-primary: #007AFF;
  --color-secondary: #5856D6;
  --color-accent: #FF9500;
  --color-background: #FFFFFF;
  --color-surface: #F2F2F7;
  --color-surface-secondary: #E5E5EA;
  --color-text-primary: #000000;
  --color-text-secondary: #3C3C43;
  --color-text-tertiary: #3C3C4399;
  --color-border: rgba(60, 60, 67, 0.18);
  --color-border-strong: rgba(60, 60, 67, 0.36);
  --color-error: #FF3B30;
  --color-warning: #FF9500;
  --color-success: #34C759;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --spacing-3xl: 64px;
  --spacing-4xl: 96px;
  
  /* Typography */
  --font-size-large-title: 34px;
  --font-size-title-1: 28px;
  --font-size-title-2: 22px;
  --font-size-title-3: 20px;
  --font-size-headline: 17px;
  --font-size-body: 17px;
  --font-size-callout: 16px;
  --font-size-subheadline: 15px;
  --font-size-footnote: 13px;
  --font-size-caption-1: 12px;
  --font-size-caption-2: 11px;
  
  --font-weight-bold: 700;
  --font-weight-semibold: 600;
  --font-weight-medium: 500;
  --font-weight-regular: 400;
  
  /* Animation */
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  
  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.16);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.2);
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #0A84FF;
    --color-secondary: #5E5CE6;
    --color-accent: #FF9F0A;
    --color-background: #000000;
    --color-surface: #1C1C1E;
    --color-surface-secondary: #2C2C2E;
    --color-text-primary: #FFFFFF;
    --color-text-secondary: #EBEBF5;
    --color-text-tertiary: #EBEBF599;
    --color-border: rgba(235, 235, 245, 0.18);
    --color-border-strong: rgba(235, 235, 245, 0.36);
    --color-error: #FF453A;
    --color-warning: #FF9F0A;
    --color-success: #32D74B;
  }
}
```

### Step 2: Set Up Base Styles

Create base styles that apply to all elements and establish the foundation for your design system.

```css
/* Reset and base styles */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
               "Helvetica Neue", Arial, sans-serif;
  font-size: var(--font-size-body);
  line-height: 1.5;
  color: var(--color-text-primary);
  background: var(--color-background);
  min-height: 100vh;
}

/* Focus styles */
*:focus {
  outline: none;
}

*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Step 3: Create Utility Classes

Build a library of utility classes for common patterns and quick styling.

```css
/* Text styles */
.text-large-title { font-size: var(--font-size-large-title); font-weight: var(--font-weight-bold); line-height: 1.21; }
.text-title-1 { font-size: var(--font-size-title-1); font-weight: var(--font-weight-bold); line-height: 1.21; }
.text-title-2 { font-size: var(--font-size-title-2); font-weight: var(--font-weight-bold); line-height: 1.27; }
.text-title-3 { font-size: var(--font-size-title-3); font-weight: var(--font-weight-semibold); line-height: 1.25; }
.text-headline { font-size: var(--font-size-headline); font-weight: var(--font-weight-semibold); line-height: 1.29; }
.text-body { font-size: var(--font-size-body); font-weight: var(--font-weight-regular); line-height: 1.29; }
.text-callout { font-size: var(--font-size-callout); font-weight: var(--font-weight-regular); line-height: 1.31; }
.text-subheadline { font-size: var(--font-size-subheadline); font-weight: var(--font-weight-regular); line-height: 1.33; }
.text-footnote { font-size: var(--font-size-footnote); font-weight: var(--font-weight-regular); line-height: 1.38; }
.text-caption-1 { font-size: var(--font-size-caption-1); font-weight: var(--font-weight-regular); line-height: 1.33; }
.text-caption-2 { font-size: var(--font-size-caption-2); font-weight: var(--font-weight-regular); line-height: 1.18; }

/* Spacing utilities */
.p-xs { padding: var(--spacing-xs); }
.p-sm { padding: var(--spacing-sm); }
.p-md { padding: var(--spacing-md); }
.p-lg { padding: var(--spacing-lg); }
.p-xl { padding: var(--spacing-xl); }

.m-xs { margin: var(--spacing-xs); }
.m-sm { margin: var(--spacing-sm); }
.m-md { margin: var(--spacing-md); }
.m-lg { margin: var(--spacing-lg); }
.m-xl { margin: var(--spacing-xl); }

/* Flexbox utilities */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.gap-sm { gap: var(--spacing-sm); }
.gap-md { gap: var(--spacing-md); }
.gap-lg { gap: var(--spacing-lg); }

/* Container */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-md);
}

@media (min-width: 640px) {
  .container { padding: 0 var(--spacing-lg); }
}

@media (min-width: 1024px) {
  .container { padding: 0 var(--spacing-xl); }
}
```

### Step 4: Build Component Library

Implement all the components from the Component Library section, organizing them into separate files or sections for maintainability.

### Step 5: Test and Refine

**Accessibility Testing:**
- Test with keyboard navigation only
- Use screen readers (VoiceOver on macOS, NVDA on Windows)
- Verify color contrast ratios
- Test at different text sizes (100%, 125%, 150%, 200%)

**Cross-Browser Testing:**
- Test in Chrome, Firefox, Safari, and Edge
- Verify backdrop-filter support (provide fallbacks if needed)
- Check for layout inconsistencies

**Responsive Testing:**
- Test at different viewport sizes
- Verify touch target sizes on mobile devices
- Ensure content is accessible at all breakpoints

**Performance Testing:**
- Minimize CSS file size
- Optimize animations for performance
- Test on lower-end devices

### Implementation Checklist

Use this checklist when building a new web application with this design system:

**Foundation**
- [ ] Set up CSS custom properties for colors, spacing, and typography
- [ ] Implement light and dark mode support with `prefers-color-scheme`
- [ ] Configure system font stack
- [ ] Define text style hierarchy
- [ ] Create utility classes for common patterns

**Layout**
- [ ] Create responsive breakpoints
- [ ] Implement safe area support with `env()` variables
- [ ] Set up spacing scale
- [ ] Define grid or flexbox layout system
- [ ] Test layouts at different viewport sizes

**Components**
- [ ] Build button variants (primary, secondary, tertiary)
- [ ] Create card components with hover effects
- [ ] Design input fields with focus states
- [ ] Implement navigation bar with Liquid Glass effect
- [ ] Build modal dialogs
- [ ] Create toggle switches and form controls

**Glassmorphism**
- [ ] Apply Liquid Glass to navigation elements
- [ ] Use standard materials for content layer
- [ ] Test legibility across different backgrounds
- [ ] Ensure proper contrast and readability
- [ ] Verify backdrop-filter support and provide fallbacks

**Accessibility**
- [ ] Verify color contrast ratios meet WCAG AA standards
- [ ] Test keyboard navigation for all interactive elements
- [ ] Add ARIA labels where needed
- [ ] Support screen readers with semantic HTML
- [ ] Test with different text sizes
- [ ] Ensure touch targets meet minimum size requirements
- [ ] Respect `prefers-reduced-motion` preference

**Polish**
- [ ] Add subtle hover and focus animations
- [ ] Implement loading states
- [ ] Create smooth transitions between states
- [ ] Test across different browsers and devices
- [ ] Optimize performance
- [ ] Document component usage

---

## References

[1] Apple Developer. "Human Interface Guidelines." Apple Developer Documentation. https://developer.apple.com/design/human-interface-guidelines

[2] Apple Developer. "Materials." Apple Developer Documentation. https://developer.apple.com/design/human-interface-guidelines/materials

[3] Apple Developer. "Color." Apple Developer Documentation. https://developer.apple.com/design/human-interface-guidelines/color

[4] Apple Developer. "Typography." Apple Developer Documentation. https://developer.apple.com/design/human-interface-guidelines/typography

[5] Apple Developer. "Layout." Apple Developer Documentation. https://developer.apple.com/design/human-interface-guidelines/layout

[6] Apple Newsroom. "Apple introduces a delightful and elegant new software design." June 9, 2025. https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/

---

## Conclusion

This comprehensive design system provides everything you need to build web applications that feel refined, intuitive, and consistent with modern design standards. By following Apple's Human Interface Guidelines, you create experiences that users will find familiar and comfortable, allowing them to focus on their tasks rather than learning new interaction patterns.

The key to success with this design system is consistency. Use the same spacing scale throughout your application. Apply colors based on their semantic meaning, not their appearance. Follow the typography hierarchy to establish clear information architecture. Implement Liquid Glass sparingly and purposefully. Test your designs across different contexts and with diverse users.

Remember that these are guidelines, not rigid rules. Adapt them to your specific needs while maintaining the core principles of hierarchy, harmony, and consistency. The goal is not to copy Apple's design exactly, but to learn from their decades of design expertise and apply those principles to create exceptional web experiences.

As you build with this system, you'll develop an intuition for what works and what doesn't. Trust that intuition, but always validate your decisions through user testing and feedback. The best designs are those that solve real problems for real people, and no design system can replace thoughtful consideration of your users' needs.

Use this document as your foundation, but don't be afraid to evolve it as your application grows and your understanding deepens. Document your decisions, share your learnings with your team, and continuously refine your approach. Great design is an iterative process, and this design system is just the beginning of your journey toward creating truly exceptional user experiences.
