# Python Primitive Types

## Overview

Python has several built-in primitive types. The most common are:

- `int` — whole numbers: `0`, `42`, `-7`
- `float` — decimal numbers: `3.14`, `-0.5`, `1.0`
- `str` — text strings: `'hello'`, `"ATCG"`
- `bool` — True or False (subclass of int)

## Division Behavior

In Python 3, the `/` operator always returns a `float`, even when both operands are integers.

```python
5 / 2     # returns 2.5, not 2
```

Use `//` (floor division) for integer results:

```python
5 // 2    # returns 2
```

The `%` operator returns the remainder:

```python
5 % 2     # returns 1
```

## Type Conversion

Types can be converted explicitly:

```python
int(3.7)    # 3  (truncates, does not round)
float(4)    # 4.0
str(42)     # '42'
bool(0)     # False
bool(1)     # True
bool('')    # False  (empty string is falsy)
bool('a')   # True   (non-empty string is truthy)
```

## Truthiness

Every Python value has a truth value. Falsy values include:
- `0`, `0.0`, `False`, `None`, `''`, `[]`, `{}`, `()`

Everything else is truthy.

## String Concatenation

Strings concatenate with `+`, but `+` does NOT convert types automatically:

```python
'Hello ' + 'world'   # 'Hello world'
'count: ' + str(5)   # 'count: 5'
'count: ' + 5        # TypeError!
```

Use f-strings for mixed-type formatting:

```python
name = 'Alice'
score = 95
print(f'{name} scored {score}')  # Alice scored 95
```
