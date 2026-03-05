// Code.gs — server-side entry point for Brainule v1

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  template.bootstrapData = JSON.stringify(getBootstrapData_());
  const output = template.evaluate();
  output
    .setTitle('Brainule')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return output;
}

function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}

// ---------------------------------------------------------------------------
// Bootstrap data assembly
// ---------------------------------------------------------------------------

function getBootstrapData_() {
  return {
    topicsFlat: getTopicsFlat_(),
    questionBank: getQuestionBank_()
  };
}

// ---------------------------------------------------------------------------
// Content — topics
// ---------------------------------------------------------------------------

function getTopicsFlat_() {
  return [
    {
      "topic_slug": "data_types_containers_and_sequence_operations",
      "title": "Data types, containers, and sequence operations",
      "scope": "Variables as names bound to values, and how Python data types constrain valid operations. Includes ints, floats, bools, strings, None, plus list/tuple/set/dict as the core containers used to represent biological collections and records. Includes indexing and slicing on sequence-like data (especially DNA strings), string processing, reverse complements at a conceptual level, and avoiding off-by-one errors.",
      "path": ["cs", "python_literacy", "subtopics"]
    },
    {
      "topic_slug": "control_flow_and_iteration",
      "title": "Control flow and iteration",
      "scope": "How programs branch and repeat work. Includes if/elif/else, for and while loops, break/continue, iterating over lists and dictionaries, and tracing a program step-by-step to predict behavior.",
      "path": ["cs", "python_literacy", "subtopics"]
    },
    {
      "topic_slug": "functions_parameters_and_scope",
      "title": "Functions, parameters, return values, and scope",
      "scope": "Defining and calling functions, passing arguments, and using return values. Includes local scope, default arguments, and treating functions as reusable units of logic.",
      "path": ["cs", "python_literacy", "subtopics"]
    },
    {
      "topic_slug": "algorithmic_complexity_and_performance_reasoning",
      "title": "Algorithmic complexity and performance reasoning",
      "scope": "Estimating how runtime and memory usage scale with input size. Includes Big-O reasoning from code structure (for example loops, nested loops, and dictionary lookups), comparing alternative implementations, and choosing appropriate complexity targets for biological computing tasks without requiring advanced proofs.",
      "path": ["cs", "python_literacy", "subtopics"]
    },
    {
      "topic_slug": "tracebacks_and_exceptions",
      "title": "Tracebacks and exception-based error handling",
      "scope": "Reading stack traces to find where and why code failed. Includes raising exceptions intentionally for illegal inputs, writing clear error messages, and distinguishing 'invalid argument' from 'bug'.",
      "path": ["cs", "correctness_and_debugging", "subtopics"]
    },
    {
      "topic_slug": "automated_testing_and_validation",
      "title": "Automated testing and validation design",
      "scope": "Writing tests that define correctness and prevent regressions. Includes pytest structure, assertions, fixtures, validated example tests, edge cases (such as case normalization), truisms (property checks), and using inverse functions or simulators for validation.",
      "path": ["cs", "correctness_and_debugging", "subtopics"]
    },
    {
      "topic_slug": "schemas_identity_and_serialization",
      "title": "Schemas, identity, and serialization",
      "scope": "Defining what fields exist, what must always be true, and how objects are referenced. Includes required vs optional fields, invariants and validators, stable IDs and registries (reference-by-identifier), and representations that can be saved and reloaded without losing meaning.",
      "path": ["cs", "modeling_and_tools", "subtopics"]
    },
    {
      "topic_slug": "api_contracts_and_mcp",
      "title": "API contracts and MCP tool boundaries",
      "scope": "Designing function signatures and return structures so callers know what is expected and guaranteed. Includes explicit error modes, separating pure computation from I/O and side effects, and MCP fundamentals (Resources, Tools, Prompts; host/client/server roles; tool invocation as a controlled action).",
      "path": ["cs", "modeling_and_tools", "subtopics"]
    },
    {
      "topic_slug": "dna_rna_protein_and_core_processes",
      "title": "DNA, RNA, protein, and the core information transformations",
      "scope": "What DNA, RNA, and proteins represent and what they are used for, plus the core transformations of replication, transcription, and translation. Includes template usage, directionality, and what is copied versus decoded.",
      "path": ["bio", "central_dogma", "subtopics"]
    },
    {
      "topic_slug": "regulation_control_points",
      "title": "Regulation and control points",
      "scope": "Where regulation acts on the dogma. Includes promoter control, RNA processing and degradation, translation initiation, and protein turnover.",
      "path": ["bio", "central_dogma", "subtopics"]
    },
    {
      "topic_slug": "genome_strain_and_chassis_constraints",
      "title": "Genome context, strain identity, and chassis constraints",
      "scope": "Genome/locus context as the backdrop for design and editing, and why context changes outcomes. Includes strain vs genotype vs phenotype, and how host compatibility and resource limits constrain designs.",
      "path": ["bio", "biological_context", "subtopics"]
    },
    {
      "topic_slug": "targeting_rules_and_design_logic",
      "title": "Targeting rules and design logic",
      "scope": "How PAM rules constrain where editing is possible and how candidate target sites are generated. Includes protospacers, strand orientation and reverse complements, and why indexing/strand mistakes break designs.",
      "path": ["bio", "crispr", "subtopics"]
    },
    {
      "topic_slug": "transcription_and_translation_control_elements",
      "title": "Transcription and translation control elements",
      "scope": "How sequence features control expression level. Includes promoters and transcription initiation, RBS and translation initiation, spacing and local context, and how RNA secondary structure can occlude functional sites near the RBS.",
      "path": ["bio", "expression_control", "subtopics"]
    },
    {
      "topic_slug": "construction_methods_and_constraints",
      "title": "DNA construction methods and constraints",
      "scope": "Building physical DNA from a design. Includes PCR and primer constraints, homology-based assembly (for example Gibson), restriction and ligation, and practical constraints like avoiding forbidden sites.",
      "path": ["bio", "dna_design_build_test", "subtopics"]
    },
    {
      "topic_slug": "coding_sequence_design_and_optimization",
      "title": "Coding sequence design and optimization",
      "scope": "Designing a coding sequence for a target protein while satisfying constraints. Includes reverse translation, codon choice and optimization objectives, restriction site removal without changing the protein sequence, and recognizing tradeoffs rather than a single best answer.",
      "path": ["bio", "dna_design_build_test", "subtopics"]
    },
    {
      "topic_slug": "verification_strategies_and_failure_modes",
      "title": "Verification strategies and failure modes",
      "scope": "Verifying DNA design software outputs and diagnosing algorithm failures. Includes truisms, validated examples, inverse-function checks, edge cases, benchmarking, and using/testing checkers to enforce domain-specific constraints.",
      "path": ["bio", "dna_design_build_test", "subtopics"]
    }
  ];
}

// ---------------------------------------------------------------------------
// Content — question bank (seed: first topic only; expand later)
// ---------------------------------------------------------------------------

function getQuestionBank_() {
  return {
    "data_types_containers_and_sequence_operations": [
      {
        "slug": "name-binding-shared-list",
        "question_format": "multiple_choice",
        "difficulty": "easy",
        "topic": "Understanding that variable assignment creates shared references, not independent copies",
        "question": "A construct's sequence is stored as a list of parts. A colleague saves\na reference so they can modify it:\n\n<python>\nparts = ['J23119', 'B0034', 'amilGFP']\nmy_copy = parts\nmy_copy.append('B0015')\n</python>\n\nHow many elements does <python>parts</python> contain after this code runs?",
        "choices": {
          "A": "3, because assignment created a separate list copy",
          "B": "4, because both names refer to the same list object",
          "C": "4, because append changes every list in memory",
          "D": "Error, because append cannot be used on a referenced list"
        },
        "answer": "B",
        "explanation": "Assignment with <python>my_copy = parts</python> binds a second name to the same list object. It does not make a copy. Appending through <python>my_copy</python> mutates that shared list, so <python>parts</python> also has 4 elements."
      },
      {
        "slug": "container-choice-for-data",
        "question_format": "multiple_choice",
        "difficulty": "easy",
        "topic": "Selecting a container type based on the properties of the data it must hold",
        "question": "You are designing a data structure for a genetic construct. It has:\n\n- an ordered series of CDS names that may repeat\n- a collection of forbidden restriction sites where order does not matter and duplicates do not matter\n\nWhich pair of container types best fits these two needs?",
        "choices": {
          "A": "list for CDS names, set for forbidden sites",
          "B": "set for CDS names, list for forbidden sites",
          "C": "dict for CDS names, set for forbidden sites",
          "D": "list for CDS names, list for forbidden sites"
        },
        "answer": "A",
        "explanation": "A list preserves order and allows repeats, which matches the CDS series. A set is a good fit for forbidden sites because membership matters, order does not, and duplicates are not meaningful."
      },
      {
        "slug": "dict-as-lookup-table",
        "question_format": "multiple_choice",
        "difficulty": "easy",
        "topic": "Forward vs. reverse lookup in a dict and what the key-value direction implies",
        "question": "The genetic code is stored as a dict mapping codons to amino acids:\n\n<python>\ngenetic_code = {'ATG': 'M', 'TTT': 'F', 'TTC': 'F', 'TAA': '*'}\n</python>\n\nA student writes:\n\n<python>\ngenetic_code['F']\n</python>\n\nWhat happens?",
        "choices": {
          "A": "It returns ['TTT', 'TTC'] because F maps to two codons",
          "B": "It returns 'TTT' as the first codon for F",
          "C": "It raises KeyError because 'F' is a value, not a key",
          "D": "It returns 'F' because dict lookup echoes the query"
        },
        "answer": "C",
        "explanation": "Dict lookup uses keys. In this dict, the keys are codons such as <pre>ATG</pre> and <pre>TTT</pre>. The amino acid <pre>F</pre> is a value, not a key, so <python>genetic_code['F']</python> raises a KeyError."
      },
      {
        "slug": "zero-based-index-extraction",
        "question_format": "multiple_choice",
        "difficulty": "easy",
        "topic": "Applying zero-based indexing to extract a specific element from sequential data",
        "question": "A promoter sequence is stored as a string:\n\n<pre>promoter = 'TTGACATATAAT'</pre>\n\nA student writes:\n\n<python>\nbase = promoter[5]\n</python>\n\nWhat value is stored in <python>base</python>?",
        "choices": {
          "A": "'A'",
          "B": "'C'",
          "C": "'T'",
          "D": "IndexError"
        },
        "answer": "A",
        "explanation": "Python uses zero-based indexing, so index 5 refers to the 6th character. In <pre>TTGACATATAAT</pre>, the character at index 5 is <pre>A</pre>."
      },
      {
        "slug": "slice-endpoint-exclusion",
        "question_format": "multiple_choice",
        "difficulty": "easy",
        "topic": "Understanding that slice endpoints are exclusive and reasoning about boundary positions",
        "question": "A genomic sequence contains a start codon beginning at index 10:\n\n<pre>genome = 'CCCGTTAAACATGAAAGGGCCC'</pre>\n\nWhich slice extracts the 3-nt codon starting at index 10?",
        "choices": {
          "A": "genome[10:13]",
          "B": "genome[10:12]",
          "C": "genome[11:14]",
          "D": "genome[10:10+2]"
        },
        "answer": "A",
        "explanation": "Python slices include the start index and exclude the end index. To get three characters starting at index 10, use indices 10, 11, and 12, which is <python>genome[10:13]</python>."
      }
    ],
    "control_flow_and_iteration": [
      {
        "slug": "loop-termination-break",
        "question_format": "multiple_choice",
        "difficulty": "easy",
        "topic": "Understanding how break exits a loop early",
        "question": "A function scans a list of restriction sites and stops at the first forbidden one:\n\n<python>\nforbidden = {'BsaI', 'BbsI'}\nfound = None\nfor site in sites:\n    if site in forbidden:\n        found = site\n        break\n</python>\n\nIf <python>sites = ['EcoRI', 'BsaI', 'BbsI']</python>, what is <python>found</python> after the loop?",
        "choices": {
          "A": "'BsaI'",
          "B": "'BbsI'",
          "C": "{'BsaI', 'BbsI'}",
          "D": "None"
        },
        "answer": "A",
        "explanation": "<python>break</python> exits the loop immediately after the first match. The loop finds <python>'BsaI'</python> at index 1, assigns it to <python>found</python>, and stops before reaching <python>'BbsI'</python>."
      },
      {
        "slug": "dict-iteration-keys-values",
        "question_format": "multiple_choice",
        "difficulty": "easy",
        "topic": "Iterating over dictionary keys vs. values vs. items",
        "question": "Given:\n\n<python>\ncodon_table = {'ATG': 'M', 'TAA': '*', 'GGC': 'G'}\nfor k in codon_table:\n    print(k)\n</python>\n\nWhat does this print?",
        "choices": {
          "A": "The keys: ATG, TAA, GGC",
          "B": "The values: M, *, G",
          "C": "Key-value pairs: ATG M, TAA *, GGC G",
          "D": "The length: 3"
        },
        "answer": "A",
        "explanation": "Iterating over a dict with a plain <python>for k in d</python> loop yields the keys. To get values use <python>d.values()</python>; to get pairs use <python>d.items()</python>."
      }
    ],
    "functions_parameters_and_scope": [
      {
        "slug": "local-scope-no-leak",
        "question_format": "multiple_choice",
        "difficulty": "easy",
        "topic": "Understanding that local variables do not exist outside the function",
        "question": "A student writes:\n\n<python>\ndef compute_gc(seq):\n    count = seq.count('G') + seq.count('C')\n    return count / len(seq)\n\ncompute_gc('ATGC')\nprint(count)\n</python>\n\nWhat happens when <python>print(count)</python> runs?",
        "choices": {
          "A": "It prints 2",
          "B": "It prints 0.5",
          "C": "NameError: name 'count' is not defined",
          "D": "It prints None"
        },
        "answer": "C",
        "explanation": "<python>count</python> is a local variable inside <python>compute_gc</python>. It does not exist in the outer scope. Attempting to print it after the function returns raises a NameError."
      }
    ],
    "algorithmic_complexity_and_performance_reasoning": [
      {
        "slug": "nested-loop-complexity",
        "question_format": "multiple_choice",
        "difficulty": "medium",
        "topic": "Identifying O(n²) complexity from a nested loop structure",
        "question": "A function checks every pair of sites in a list for overlap:\n\n<python>\ndef find_overlaps(sites):\n    overlaps = []\n    for i in range(len(sites)):\n        for j in range(i + 1, len(sites)):\n            if overlaps_with(sites[i], sites[j]):\n                overlaps.append((i, j))\n    return overlaps\n</python>\n\nIf <python>sites</python> has <python>n</python> elements, what is the time complexity?",
        "choices": {
          "A": "O(n)",
          "B": "O(n log n)",
          "C": "O(n²)",
          "D": "O(2ⁿ)"
        },
        "answer": "C",
        "explanation": "The outer loop runs n times and the inner loop runs up to n times for each outer iteration, producing roughly n²/2 comparisons. That is O(n²)."
      }
    ],
    "tracebacks_and_exceptions": [
      {
        "slug": "raise-on-invalid-input",
        "question_format": "multiple_choice",
        "difficulty": "easy",
        "topic": "Raising exceptions intentionally for invalid inputs",
        "question": "A function validates a DNA sequence before processing it:\n\n<python>\ndef validate_dna(seq):\n    valid = set('ATGC')\n    for base in seq.upper():\n        if base not in valid:\n            raise ValueError(f'Invalid base: {base}')\n</python>\n\nWhat happens when <python>validate_dna('ATXC')</python> is called?",
        "choices": {
          "A": "It silently skips X and processes ATG and C",
          "B": "It raises ValueError with the message 'Invalid base: X'",
          "C": "It raises KeyError because X is not in the set",
          "D": "It returns False"
        },
        "answer": "B",
        "explanation": "When the loop reaches <pre>X</pre>, the condition <python>base not in valid</python> is True, so the function raises <python>ValueError</python> with the formatted message identifying the bad base."
      }
    ],
    "automated_testing_and_validation": [
      {
        "slug": "truism-property-test",
        "question_format": "multiple_choice",
        "difficulty": "medium",
        "topic": "Using a truism (property check) to validate a reverse complement function",
        "question": "A truism for a reverse complement function is that applying it twice should return the original sequence. Which test correctly checks this property?",
        "choices": {
          "A": "assert reverse_complement('ATGC') == 'GCAT'",
          "B": "assert reverse_complement(reverse_complement(seq)) == seq",
          "C": "assert len(reverse_complement(seq)) == len(seq)",
          "D": "assert reverse_complement(seq) != seq"
        },
        "answer": "B",
        "explanation": "A truism is a property that must hold for all valid inputs, not just one example. Applying reverse complement twice must return the original sequence — this checks the function's mathematical inverse property rather than a single known answer."
      }
    ],
    "schemas_identity_and_serialization": [
      {
        "slug": "stable-id-reference",
        "question_format": "multiple_choice",
        "difficulty": "medium",
        "topic": "Using a stable identifier to reference an object rather than embedding it inline",
        "question": "A design system stores RBS parts in a registry keyed by part ID. A construct record could store the RBS in two ways:\n\n- Option 1: embed the full RBS sequence and metadata inline in the construct record\n- Option 2: store only the part ID and look it up in the registry at runtime\n\nWhat is the main advantage of Option 2?",
        "choices": {
          "A": "It makes serialization impossible because the data is not inline",
          "B": "It ensures the construct record stays consistent when the registry entry is updated",
          "C": "It eliminates the need for a registry lookup at runtime",
          "D": "It prevents the same part from being used in multiple constructs"
        },
        "answer": "B",
        "explanation": "Storing a stable ID rather than inlining data means there is a single source of truth. If the registry entry is corrected or updated, all constructs referencing that ID automatically reflect the change without needing to update each record individually."
      }
    ],
    "dna_rna_protein_and_core_processes": [
      {
        "slug": "transcription-template-strand",
        "question_format": "multiple_choice",
        "difficulty": "easy",
        "topic": "Identifying which strand serves as template during transcription",
        "question": "A double-stranded DNA molecule has the coding strand sequence <pre>5'-ATGAAACCC-3'</pre>. Which statement about transcription is correct?",
        "choices": {
          "A": "RNA polymerase copies the coding strand directly to produce mRNA",
          "B": "RNA polymerase reads the template strand 3'→5' to produce mRNA 5'→3'",
          "C": "Transcription produces a DNA copy of the template strand",
          "D": "The coding strand is read 5'→3' to produce mRNA"
        },
        "answer": "B",
        "explanation": "RNA polymerase reads the template strand in the 3'→5' direction and synthesizes mRNA in the 5'→3' direction. The resulting mRNA sequence matches the coding strand (with U replacing T)."
      }
    ],
    "targeting_rules_and_design_logic": [
      {
        "slug": "pam-sequence-requirement",
        "question_format": "multiple_choice",
        "difficulty": "easy",
        "topic": "Understanding PAM sequence requirements for CRISPR-Cas9 targeting",
        "question": "SpCas9 requires an NGG PAM sequence immediately 3' of the protospacer on the non-template strand. Given the genomic sequence:\n\n<pre>5'-AACGATCGTAGCTAGCTAGGNGG-3'</pre>\n\nWhere is the PAM located relative to the protospacer?",
        "choices": {
          "A": "The PAM is the NGG immediately 5' of the 20-nt protospacer",
          "B": "The PAM is the NGG immediately 3' of the 20-nt protospacer on the non-template strand",
          "C": "The PAM can be anywhere in the genomic sequence",
          "D": "The PAM is on the template strand, 5' of the protospacer"
        },
        "answer": "B",
        "explanation": "SpCas9 recognizes an NGG trinucleotide immediately 3' of the 20-nucleotide protospacer on the non-template (coding) strand. This PAM is required for Cas9 binding and cleavage."
      }
    ]
  };
}
