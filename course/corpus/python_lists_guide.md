# Python Lists and Mutability

## What is a List?

A list is a mutable, ordered sequence of values in Python.

```python
promoters = ['J23119', 'J23101', 'J23106']
```

Lists can contain mixed types, though in bioinformatics they usually hold one type.

## Indexing

Python uses zero-based indexing:

```python
promoters[0]   # 'J23119'  (first element)
promoters[2]   # 'J23106'  (third element)
promoters[-1]  # 'J23106'  (last element — negative indexing)
promoters[-2]  # 'J23101'  (second to last)
```

Accessing an index beyond the end raises `IndexError`.

## Slicing

Slices return a new list from index `start` up to but NOT including `stop`:

```python
promoters[0:2]   # ['J23119', 'J23101']
promoters[1:]    # ['J23101', 'J23106']
promoters[:2]    # ['J23119', 'J23101']
```

## Mutation

Lists are mutable — you can change them in place:

```python
promoters.append('J23115')   # adds to end
promoters[0] = 'J23118'      # replaces first element
promoters.pop()              # removes and returns last element
```

## Reference vs. Copy — Critical!

Assignment does NOT copy a list. It creates a second name pointing to the same object:

```python
parts = ['J23119', 'B0034']
my_copy = parts          # NOT a copy — both names point to same list
my_copy.append('B0015')  # also modifies parts!
print(parts)             # ['J23119', 'B0034', 'B0015']
```

To make a real copy:

```python
my_copy = parts.copy()   # shallow copy
my_copy = list(parts)    # also a shallow copy
my_copy = parts[:]       # slice copy — equivalent
```

For nested lists, use `copy.deepcopy(parts)`.
