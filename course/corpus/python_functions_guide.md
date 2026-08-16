# Defining and Calling Functions

## Overview

A function packages a piece of work under a name so it can be reused. In Python a
function is defined with `def`, a name, a parameter list in parentheses, a colon,
and an indented body:

```python
def square(n):
    return n ** 2
```

Calling it runs the body with the argument bound to the parameter:

```python
square(4)    # 16
```

Python has no `function` keyword, no braces, and no arrow syntax. The body is
delimited by indentation, and the header always ends with a colon.

## Definition Order

A function must be defined before the line that calls it runs. Python executes a
module top to bottom, so a call placed above the `def` raises `NameError`.

```python
greet('Alice')          # NameError: name 'greet' is not defined

def greet(name):
    print('Hello, ' + name)
```

## Return Versus Print

`return` hands a value back to the caller. `print()` writes text to the console and
evaluates to `None`. They are not interchangeable.

```python
def add_printing(a, b):
    print(a + b)        # shows the sum, gives the caller nothing

def add_returning(a, b):
    return a + b        # gives the caller the sum

x = add_printing(2, 3)  # prints 5; x is None
y = add_returning(2, 3) # prints nothing; y is 5
```

A function with no `return` statement — or with a bare `return` — returns `None`.
This is why assigning the result of a printing function yields `None`.

## Parameters and Arguments

Parameters are named in the definition; arguments are the values supplied at the
call. Arguments may be passed positionally or by keyword:

```python
def describe(name, level):
    return f'{name} is at level {level}'

describe('Alice', 3)              # positional
describe(name='Alice', level=3)   # keyword
describe('Alice', level=3)        # mixed — positional first
```

## Default Parameter Values

A parameter can declare a default, which is used when the caller omits it:

```python
def add(a, b=10):
    return a + b

add(5)        # 15  — b defaults to 10
add(5, 2)     # 7
```

Parameters with defaults must come after parameters without them.

## Mutable Default Arguments

A default value is evaluated **once**, when the `def` statement runs — not on each
call. A mutable default such as a list is therefore shared by every call that
relies on it:

```python
def append_item(item, lst=[]):
    lst.append(item)
    return lst

append_item(1)    # [1]
append_item(2)    # [1, 2]  — the same list, still holding the earlier item
```

The standard fix is a `None` sentinel, creating a fresh object per call:

```python
def append_item(item, lst=None):
    if lst is None:
        lst = []
    lst.append(item)
    return lst
```

## Functions in Sequence Work

Functions are how sequence operations get reused across a program:

```python
def gc_content(dna):
    gc = dna.count('G') + dna.count('C')
    return gc / len(dna)

gc_content('ATGCGC')   # 0.6666666666666666
```

Because `gc_content` returns its value rather than printing it, the result can be
stored, compared, or passed to another function.
