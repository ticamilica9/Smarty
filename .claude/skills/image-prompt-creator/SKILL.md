---
name: image-prompt-creator
description: Use when writing prompts for AI image generation with Flux, Midjourney, or Stable Diffusion -- crafting product photos, UI mockups, marketing banners, app icons, or iterating prompt structure for better results
---

# Image Prompt Creator

## Overview

Write image generation prompts that consistently produce the output you want. This skill covers prompt structure for Flux, Midjourney, and Stable Diffusion, prompt elements (subject, style, lighting, composition, mood, technical params), style-specific templates, platform syntax, and an iteration workflow.

**Core principle:** Treat prompting as iterative engineering, not magic. Start simple, add detail one element at a time, and refine based on observed results.

## Prompt Structure

Every effective prompt follows this structure:

```
[SUBJECT] + [ACTION/CONTEXT] + [ENVIRONMENT/BACKGROUND] + [LIGHTING] + [COMPOSITION] + [STYLE/AESTHETIC] + [MOOD/ATMOSPHERE] + [TECHNICAL PARAMS]
```

### Prompt Elements

| Element | What It Controls | Example |
|---------|-----------------|---------|
| **Subject** | Main object or person | "A ceramic coffee mug", "A minimalist smartphone" |
| **Action/Context** | What the subject is doing or its state | "on a wooden table", "held in a hand" |
| **Environment** | Background and setting | "cafe interior with soft bokeh background" |
| **Lighting** | Light source, direction, quality | "soft diffused window light from the left" |
| **Composition** | Camera angle, framing, lens | "close-up shot, slight overhead angle, 85mm lens" |
| **Style** | Artistic direction, medium | "photorealistic, product photography" |
| **Mood** | Emotional tone | "warm and inviting, cozy atmosphere" |
| **Technical** | Platform-specific settings | `--ar 3:2`, `--s 250`, negative prompts |

## Style-Specific Prompts

### Product Photography

```
A minimal ceramic pour-over coffee dripper on a matte black stone surface,
side profile view, soft diffused studio lighting from the left,
a thin stream of water pouring through, slight steam,
photorealistic, commercial product photography, 85mm macro lens,
sharp focus on the dripper, shallow depth of field,
neutral beige background, clean composition
```

**Keywords:** commercial product photography, macro lens, studio lighting, clean background, sharp focus, shallow depth of field

### UI Mockups

```
A modern fintech mobile app dashboard on an iPhone 15 Pro,
displaying account balance chart and recent transactions,
dark mode, gradient purple background,
UI/UX mockup style, clean interface, high fidelity,
flat design with subtle shadows, iOS design language,
centered composition, screen filling the frame
```

**Keywords:** UI/UX mockup, high fidelity, screen display, flat design, dark mode, centered composition

**Note for UI:** Use "screenshot" or "mobile app screen" in the subject line. Specify device frame for context. Avoid adding UI elements that don't exist in your actual app.

### Marketing Banners

```
A promotional banner for a coffee subscription service,
wide format, left side: bold text area with "Fresh Coffee Weekly" in modern sans-serif,
right side: a burlap sack of coffee beans spilling onto a rustic wooden table,
warm golden hour lighting, rich brown and cream color palette,
commercial photography style, professional composition,
high contrast, vibrant colors, text-safe margins on the left
```

**Keywords:** promotional banner, commercial photography, wide format, text-safe area, high contrast, vibrant

### App Icons

```
A minimalist app icon for a meditation app,
a simple lotus flower silhouette on a gradient sunset background
purple to orange, rounded square shape,
flat design, iOS style, vector quality, clean,
centered composition, vibrant colors, no text
```

**Keywords:** app icon, rounded square, flat design, vector quality, centered composition, no text, iOS style

## Platform-Specific Syntax

### Midjourney

```
/imagine prompt: [prompt text] --ar 16:9 --style raw --s 250 --v 6.1
```

| Parameter | Values | Purpose |
|-----------|--------|---------|
| `--ar` | `16:9`, `3:2`, `4:3`, `1:1`, `9:16`, `2:3`, `3:4` | Aspect ratio |
| `--style raw` | `raw`, `expressive`, `cute`, `scenic` | Style tuning (raw = more prompt-adherent) |
| `--s` (stylize) | `0`-`1000` (default `100`) | How strongly Midjourney applies its own aesthetic |
| `--v` | `6.1`, `6.0`, `5.2` | Model version |
| `--iw` | `0`-`2` | Image weight (when using image reference) |
| `--no` | `text, watermark, signature` | Negative prompting (limited) |
| `--cw` | `0`-`100` | Character reference weight |
| `--chaos` | `0`-`100` | Variation between generated images |

**Best practices:**
- Put the most important elements first (Midjourney weights early tokens more)
- Use `--style raw` for photorealistic/product work to reduce MJ's stylization
- For character consistency, use `--cref` with a reference image URL
- Avoid "photorealistic" with `--style raw` -- they conflict

### Stable Diffusion (SDXL / SD3)

```
Positive prompt: [detailed prompt text]
Negative prompt: [things to avoid]
Steps: 25, CFG: 7, Sampler: DPM++ 2M Karras, Size: 1024x1024
```

| Parameter | Values | Purpose |
|-----------|--------|---------|
| **Positive prompt** | Full description | What to generate |
| **Negative prompt** | Comma-separated exclusions | What to avoid |
| **Steps** | `20`-`50` (default `25`) | More steps = more detail, diminishing returns after 30 |
| **CFG Scale** | `3`-`15` (default `7`) | Prompt adherence. Lower = more creative, higher = more literal. Above 12 produces artifacts |
| **Sampler** | `DPM++ 2M Karras`, `Euler a`, `DDIM` | Trade-off between speed and quality |
| **Seed** | `-1` (random) or fixed | Reproducibility |
| **Size** | Must match model's native resolution | SDXL typically `1024x1024` |

**Negative prompt patterns:**
```
ugly, tiling, poorly drawn hands, deformed, extra limbs, disfigured,
bad anatomy, watermark, text, signature, low quality, blurry,
distorted, bad proportions, duplicate, morbid, mutilated
```

**Best practices:**
- Use **Clip Skip** `2` for SDXL (less literal interpretation)
- Use **Hires fix** for upscaling (factor `1.5`-`2`, denoising `0.4`-`0.5`)
- Match batch size and resolution to your GPU memory
- Refiner model (SDXL): use at 0.6-0.8 denoising for the second pass

### Flux

```
[prompt text]
```

| Parameter | Values | Purpose |
|-----------|--------|---------|
| **Guidance** | `2.0`-`5.0` (default `3.5`) | Prompt adherence. Flux is very responsive to guidance |
| **Steps** | `20`-`50` (default `28`) | Quality vs speed |
| **Resolution** | Multiple of `64` | Check model's native resolution (typically `1024x1024`) |

**Key differences from other platforms:**
- Flux follows natural language prompts extremely well -- shorter prompts often work better
- Does NOT need "photorealistic" or "masterpiece" quality tags (unlike SD)
- Guidance scale of `3.5` is the sweet spot; higher values risk artifacts
- Flux handles text in images better than SD, but still imperfect for long strings
- No native negative prompt support in base Flux (use guidance instead)

**Best practices:**
- Keep prompts concise -- let Flux interpret naturally
- Specify lighting and composition explicitly
- Use `3.5` guidance as a starting point, adjust by `0.5` increments
- For consistent characters, use image-to-image with low denoising

## Iteration Workflow

### Step 1: Start Simple

```
A ceramic mug on a table
```

Generate 2-4 variations. Does the subject look right? Is the composition acceptable?

### Step 2: Add Environment and Lighting

```
A ceramic mug on a wooden table, cafe background with bokeh, soft window light
```

Is the setting right? Does the lighting match your vision?

### Step 3: Add Style and Technical Details

```
A ceramic mug on a wooden table, cafe background with soft bokeh,
soft window light from left, close-up composition, 85mm lens,
commercial product photography style, warm atmosphere
```

Add platform-specific parameters (aspect ratio, stylize, etc.)

### Step 4: Refine Based on Results

**If subject is wrong:** Rewrite subject description, use image reference
**If style is off:** Adjust style keywords, tweak platform parameters
**If composition is bad:** Change framing keywords, adjust aspect ratio
**If colors are wrong:** Add specific color palette to prompt
**If unwanted objects appear:** Add to negative prompt (SD) or rewrite to exclude

### Iteration Loop

```
Generate -> Evaluate -> Identify single worst issue -> Adjust one parameter -> Generate
```

**Change one thing at a time.** If you adjust lighting AND composition AND style, you won't know which change fixed or broke the result.

## Common Mistakes

### Overprompting
More words don't mean better results. Beyond 50-80 words, quality plateaus and can degrade. Trim adjectives that don't affect the output.

### Conflicting instructions
"Photorealistic" + "oil painting" = neither. Pick one style direction and commit.

### Wrong aspect ratio
A vertical product shot in `--ar 16:9` creates wasted space. Match ratio to use case: `4:3` for products, `16:9` for banners, `1:1` for icons.

### Ignoring negative prompts (SD)
Without negative prompts, SD will fill backgrounds with common artifacts. Always include hands, anatomy, and quality negatives for human subjects.

### No iteration
The first generation is rarely the final one. Budget time for 3-5 refinement rounds per image.

## Quick Reference

| Platform | Best For | Key Parameter | Negative Prompt? |
|----------|----------|---------------|-----------------|
| Midjourney | Artistic, stylized, concept art | `--style raw`, `--s`, `--ar` | Limited (`--no`) |
| Stable Diffusion | Photorealistic, technical, precise | `CFG: 7`, `Steps: 25` | Full support |
| Flux | Natural language, text in images, speed | `Guidance: 3.5` | No (use guidance) |

### Aspect Ratio Cheat Sheet

| Use Case | Ratio | Midjourney | SD/Flux |
|----------|-------|------------|---------|
| Square (social, icons) | `1:1` | `--ar 1:1` | `1024x1024` |
| Portrait (product, mobile) | `3:4` | `--ar 3:4` | `768x1024` |
| Landscape (photo) | `3:2` | `--ar 3:2` | `1024x680` |
| Widescreen (banners) | `16:9` | `--ar 16:9` | `1024x576` |
| Cinematic | `21:9` | `--ar 21:9` | `1344x576` |
| Instagram stories | `9:16` | `--ar 9:16` | `576x1024` |

## Red Flags

**Reconsider your approach when:**
- Prompt is longer than 100 words (clip it)
- Using "masterpiece, best quality, 8K, ultra detailed" as a crutch (these are SD LoRA training artifacts, not real quality modifiers)
- Not using any platform-specific parameters (you're leaving quality on the table)
- Trying to generate text-heavy images (all platforms struggle with long or small text)
- Getting the same result across different seeds with varied prompts (try `--style raw` / higher CFG)
- Spending more time prompting than evaluating outputs (generate fast, iterate on real results)
