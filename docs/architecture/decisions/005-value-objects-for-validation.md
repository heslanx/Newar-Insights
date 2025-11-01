# ADR-005: Value Objects for Domain Validation

**Status**: Accepted
**Date**: 2025-11-01
**Authors**: Claude + Development Team

## Context

Input validation was scattered and inconsistent:

**Problems**:
- Email validation copy-pasted in 3 handlers
- Meeting URL format checked manually with `strings.Contains()`
- Platform validation done with raw string comparisons
- No guarantee that entities are created with valid data

**Example** (Before):
```go
// In handler
if req.Email == "" || !strings.Contains(req.Email, "@") {
    return c.Status(400).JSON(...)
}

// In another handler
if !regexp.MatchString(emailRegex, req.Email) {
    return c.Status(400).JSON(...)
}
```

Different handlers had **different validation rules** for the same data!

## Decision

Introduce **Value Objects** - immutable types that encapsulate validation:

### Value Objects Created

1. **Email** (`domain/valueobjects/email.go`)
   - Validates format via regex
   - Normalizes (lowercase, trim)
   - Provides `Domain()` method

2. **MeetingURL** (`domain/valueobjects/meeting_url.go`)
   - Validates http/https scheme
   - Parses URL structure
   - Provides `IsGoogleMeet()`, `IsTeams()`

3. **Platform** (`domain/valueobjects/platform.go`)
   - Validates against enum (`googlemeet`, `teams`)
   - Provides type-safe queries

### Usage

```go
// Creating value object (validates automatically)
email, err := valueobjects.NewEmail("test@example.com")
if err != nil {
    return err  // "invalid email format"
}

// Value objects are immutable
email.Value()  // "test@example.com" (normalized)
email.Domain() // "example.com"

// Entities use value objects
type User struct {
    email valueobjects.Email  // Guaranteed valid
    // ...
}
```

## Consequences

### Positive

✅ **Impossible to Create Invalid Entities**: Validation at construction time
✅ **Single Source of Truth**: One place defines what "valid email" means
✅ **Type Safety**: Can't accidentally use `string` where `Email` expected
✅ **Immutability**: No accidental mutations (thread-safe)
✅ **Rich Behavior**: `email.Domain()`, `url.IsGoogleMeet()`

### Negative

❌ **Verbose**: `valueobjects.NewEmail()` vs raw string
❌ **Error Handling**: Must handle validation errors at construction

### Neutral

⚖️ **More Types**: 3 additional types (Email, MeetingURL, Platform)
⚖️ **Adapter Complexity**: Entity ↔ DTO conversion must handle VOs

## Implementation

**Email Value Object**:
```go
type Email struct {
    value string  // private field (immutable)
}

func NewEmail(email string) (Email, error) {
    email = strings.TrimSpace(strings.ToLower(email))

    if !emailRegex.MatchString(email) {
        return Email{}, fmt.Errorf("invalid email format: %s", email)
    }

    return Email{value: email}, nil
}

func (e Email) Value() string {
    return e.value
}

func (e Email) Domain() string {
    parts := strings.Split(e.value, "@")
    return parts[1]
}
```

**Entity Using Value Object**:
```go
type User struct {
    id    int64
    email valueobjects.Email  // Validated at construction
    name  string
    // ...
}

func NewUser(id int64, emailStr, name string, maxBots int) (*User, error) {
    // Validate email (returns error if invalid)
    email, err := valueobjects.NewEmail(emailStr)
    if err != nil {
        return nil, fmt.Errorf("invalid email: %w", err)
    }

    // Cannot create User with invalid email!
    return &User{
        id:    id,
        email: email,
        name:  name,
    }, nil
}
```

## Alternatives Considered

### 1. Validation Functions
```go
func ValidateEmail(email string) error { ... }
```
- **Rejected**: Easy to forget calling validation
- No compiler enforcement

### 2. Struct Tags + Validator Library
```go
type User struct {
    Email string `validate:"required,email"`
}
```
- **Rejected**: Runtime validation, not compile-time
- Validation logic hidden in tags

### 3. Type Aliases
```go
type Email string
```
- **Rejected**: No validation enforcement
- Just a string with a different name

## Best Practices

### When to Use Value Objects

✅ **Use for**:
- Data with validation rules (email, URL, phone)
- Data with business meaning (Money, Temperature)
- Enums with behavior (Platform, Status)

❌ **Don't use for**:
- Simple primitives with no validation (user ID, count)
- Large blobs (file contents, images)
- Data without invariants

### Naming Convention

- `NewEmail()` - Constructor (returns error if invalid)
- `Value()` - Extract primitive value
- `Equals()` - Value equality
- No setters (immutable)

## Testing

Value objects are **easy to test**:
```go
func TestEmail_Valid(t *testing.T) {
    email, err := valueobjects.NewEmail("test@example.com")
    assert.NoError(t, err)
    assert.Equal(t, "test@example.com", email.Value())
    assert.Equal(t, "example.com", email.Domain())
}

func TestEmail_Invalid(t *testing.T) {
    _, err := valueobjects.NewEmail("invalid-email")
    assert.Error(t, err)
}
```

No database, no HTTP, no mocks needed!

## References

- [Value Objects - Martin Fowler](https://martinfowler.com/bliki/ValueObject.html)
- [DDD Value Objects](https://enterprisecraftsmanship.com/posts/value-objects-explained/)
- [Primitive Obsession Code Smell](https://refactoring.guru/smells/primitive-obsession)
