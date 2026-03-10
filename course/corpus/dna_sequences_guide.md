# DNA Sequence Representation

## DNA as Python Strings

In computational biology, DNA sequences are typically represented as Python strings
using the four IUPAC nucleotide codes: A, T, C, G.

```python
promoter = 'TTGACAGCTTATCATCG'
rbs      = 'AGGAGG'
```

By convention, sequences are written 5' to 3' and in uppercase, though Python
does not enforce this — you must normalize explicitly.

## Case Sensitivity

Python strings are case-sensitive:

```python
'ATCG' == 'atcg'   # False!
```

Always normalize before comparing or processing:

```python
seq = seq.upper()
```

## Slicing DNA Sequences

DNA slicing follows the same rules as list slicing:

```python
gene = 'ATGAAACCCGGG'
start_codon = gene[0:3]   # 'ATG'
rest        = gene[3:]    # 'AAACCCGGG'
last_three  = gene[-3:]   # 'GGG'
```

## Complement

The complement of a DNA sequence replaces each base (A↔T, G↔C) but keeps
the same 5'→3' direction:

```python
complement_map = str.maketrans('ATCG', 'TAGC')
seq = 'ATCG'
comp = seq.translate(complement_map)   # 'TAGC'
```

## Reverse Complement

The reverse complement gives the antiparallel strand read 5'→3':

```python
rev_comp = comp[::-1]   # 'CGAT'
```

Or in one step:

```python
rev_comp = seq.translate(complement_map)[::-1]
```

This is the sequence of the template strand used for transcription.

## Common String Operations on Sequences

```python
len(seq)              # number of nucleotides
seq.count('G')        # count occurrences of G
seq.find('ATG')       # position of first start codon (-1 if not found)
seq.replace('T', 'U') # convert DNA to RNA
seq + 'AAAA'          # concatenate sequences
```
