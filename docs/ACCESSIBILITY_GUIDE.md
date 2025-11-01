# Accessibility Guide - Newar Insights Chrome Extension

**WCAG 2.1 AA Compliance Checklist**

---

## ✅ Implementation Checklist

### 1. Keyboard Navigation

#### ✅ Basic Requirements
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical (follows visual order)
- [ ] Focus indicators are visible (outline, ring, etc.)
- [ ] No keyboard traps
- [ ] Skip links for main content

#### Example Implementation
```tsx
// ✅ Good: Keyboard accessible button
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  aria-label="Start recording"
>
  Start
</button>

// ✅ Good: Skip link
<a
  href="#main-content"
  className="sr-only focus:not-sr-only"
>
  Skip to main content
</a>
```

---

### 2. ARIA Labels & Semantics

#### ✅ Required ARIA Attributes

**Buttons**
```tsx
// ✅ Icon-only buttons MUST have aria-label
<button aria-label="Close dialog">
  <XIcon />
</button>

// ✅ Buttons with visible text can omit aria-label
<button>Save Changes</button>
```

**Forms**
```tsx
// ✅ All inputs MUST have labels
<label htmlFor="api-key">API Key</label>
<input id="api-key" type="text" aria-required="true" />

// ✅ Error messages
<input
  aria-invalid={hasError}
  aria-describedby={hasError ? "error-message" : undefined}
/>
{hasError && <span id="error-message" role="alert">{error}</span>}
```

**Live Regions**
```tsx
// ✅ Status messages
<div role="status" aria-live="polite">
  Recording started successfully
</div>

// ✅ Errors (urgent)
<div role="alert" aria-live="assertive">
  Failed to start recording
</div>
```

**Dialogs/Modals**
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Confirm Action</h2>
  <p id="dialog-description">Are you sure?</p>
</div>
```

---

### 3. Visual Accessibility

#### ✅ Color Contrast (WCAG AA)
```css
/* ✅ Minimum contrast ratios */
/* Normal text: 4.5:1 */
.text-normal {
  color: #ffffff; /* white */
  background: #333333; /* dark gray - 12.6:1 ✅ */
}

/* Large text (18px+): 3:1 */
.text-large {
  color: #666666; /* gray */
  background: #ffffff; /* white - 5.7:1 ✅ */
}

/* ❌ Bad contrast */
.bad-contrast {
  color: #999999; /* light gray */
  background: #ffffff; /* white - 2.8:1 ❌ */
}
```

#### ✅ Focus Indicators
```css
/* ✅ Visible focus ring */
button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* ❌ Don't remove outlines */
button:focus {
  outline: none; /* ❌ NEVER DO THIS */
}
```

#### ✅ Touch Target Sizes
```css
/* ✅ Minimum 44x44px for touch targets */
.button {
  min-width: 44px;
  min-height: 44px;
  padding: 12px 16px;
}

/* ✅ Ensure adequate spacing between targets */
.button-group {
  gap: 8px; /* Minimum 8px spacing */
}
```

---

### 4. Screen Reader Support

#### ✅ Semantic HTML
```tsx
// ✅ Use semantic elements
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/recordings">Recordings</a></li>
    </ul>
  </nav>
</header>

<main id="main-content">
  <h1>Recordings</h1>
  <section aria-labelledby="active-recordings">
    <h2 id="active-recordings">Active Recordings</h2>
  </section>
</main>

<footer>
  <p>&copy; 2025 Newar Insights</p>
</footer>

// ❌ Don't use divs for everything
<div className="header">
  <div className="nav">...</div>
</div>
```

#### ✅ Hidden Content
```tsx
// ✅ Visually hidden but accessible to screen readers
<span className="sr-only">
  Recording in progress
</span>

// ✅ Hidden from everyone
<div aria-hidden="true">
  <IconDecoration />
</div>

// CSS for sr-only
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

### 5. Common Patterns

#### ✅ Loading States
```tsx
<button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? (
    <>
      <Spinner aria-hidden="true" />
      <span className="sr-only">Loading...</span>
    </>
  ) : (
    'Start Recording'
  )}
</button>
```

#### ✅ Icon Buttons
```tsx
// ✅ Always provide accessible name
<button aria-label="Delete recording" onClick={handleDelete}>
  <TrashIcon aria-hidden="true" />
</button>

// ✅ Or use title + sr-only
<button onClick={handleDelete} title="Delete recording">
  <TrashIcon aria-hidden="true" />
  <span className="sr-only">Delete recording</span>
</button>
```

#### ✅ Status Indicators
```tsx
<div role="status">
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 bg-green-500 rounded-full" aria-hidden="true" />
    <span>Recording active</span>
  </div>
</div>
```

#### ✅ Lists
```tsx
// ✅ Use semantic lists
<ul role="list"> {/* role="list" fixes Safari bug */}
  {recordings.map(recording => (
    <li key={recording.id}>
      <RecordingCard recording={recording} />
    </li>
  ))}
</ul>

// ✅ Empty list message
{recordings.length === 0 && (
  <div role="status">
    No recordings found
  </div>
)}
```

---

## 🧪 Testing

### Manual Testing
```bash
# 1. Keyboard Navigation Test
- Tab through all interactive elements
- Ensure focus is visible
- Test with screen reader (NVDA/JAWS/VoiceOver)

# 2. Contrast Test
- Use browser DevTools Accessibility panel
- Use online tools: https://webaim.org/resources/contrastchecker/

# 3. Screen Reader Test
# macOS (VoiceOver)
CMD + F5

# Windows (NVDA - free)
# Download from: https://www.nvaccess.org/

# Chrome DevTools
# Lighthouse > Accessibility audit
```

### Automated Testing
```bash
# Install axe-core
npm install -D @axe-core/react

# Use in tests
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('should not have accessibility violations', async () => {
  const { container } = render(<App />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## 📋 Component Audit

### Buttons (Priority: High)
- [ ] GlowingButton - add aria-label for icon-only
- [ ] OutlineButton - ensure focus visible
- [ ] IconButton - add aria-label

### Forms (Priority: Critical)
- [ ] Input - associate labels
- [ ] Checkbox - add aria-checked
- [ ] Select - add aria-label

### Modals (Priority: High)
- [ ] Dialog - add role="dialog", aria-modal
- [ ] Focus trap implementation
- [ ] Escape key to close

### Navigation (Priority: Medium)
- [ ] Tab navigation - add aria-current
- [ ] Breadcrumbs - use semantic nav

---

## 🎯 Quick Fixes (High Impact)

### 1. Add aria-label to all icon-only buttons (30 min)
```tsx
// Before
<button onClick={close}>
  <XIcon />
</button>

// After
<button onClick={close} aria-label="Close">
  <XIcon aria-hidden="true" />
</button>
```

### 2. Ensure all images have alt text (15 min)
```tsx
// ✅ Decorative images
<img src="logo.png" alt="" role="presentation" />

// ✅ Meaningful images
<img src="avatar.png" alt="User profile picture" />
```

### 3. Add focus styles to all interactive elements (20 min)
```css
/* Add to global CSS */
*:focus-visible {
  outline: 2px solid var(--focus-color, #3b82f6);
  outline-offset: 2px;
}
```

---

## 📚 Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [WebAIM](https://webaim.org/)
- [axe DevTools](https://www.deque.com/axe/devtools/)

---

**Status:** Guide Complete - Ready for Implementation
**Next Steps:** Audit existing components and implement fixes
**Estimated Time:** 4-6 hours for basic compliance
