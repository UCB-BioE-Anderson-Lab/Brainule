#!/usr/bin/env python3
"""
preview.py — assembles src/ into a single preview.html and serves it locally.

Usage:
    python3 preview.py          # builds + serves at http://localhost:8080
    python3 preview.py --build  # just writes preview.html, no server
"""

import re, sys, os, http.server, threading, webbrowser

SRC   = os.path.join(os.path.dirname(__file__), 'src')
OUT   = os.path.join(os.path.dirname(__file__), 'preview.html')
PORT  = 8080

# ── Mock bootstrap data (mirrors what doGet injects server-side) ──────────────
MOCK_BOOTSTRAP = """
window.BRAINULE_BOOTSTRAP = {
  "courseSlug":  "bioe_234_midterm_sample",
  "courseTitle": "BioE 134/234 Midterm Prep",
  "userEmail":   "preview@example.com",
  "topicsFlat": [
    { "topic_slug": "data_types_containers_and_sequence_operations",
      "title": "Data types, containers, and sequence operations",
      "scope": "Variables as names bound to values, and how Python data types constrain valid operations.",
      "path": ["cs", "python_literacy", "subtopics"] },
    { "topic_slug": "control_flow_and_iteration",
      "title": "Control flow and iteration",
      "scope": "How programs branch and repeat work.",
      "path": ["cs", "python_literacy", "subtopics"] },
    { "topic_slug": "functions_parameters_and_scope",
      "title": "Functions, parameters, return values, and scope",
      "scope": "Defining and calling functions, passing arguments, and using return values.",
      "path": ["cs", "python_literacy", "subtopics"] }
  ],
  "questionBank": {
    "data_types_containers_and_sequence_operations": [
      { "slug": "preview-q1", "question_format": "multiple_choice", "difficulty": "easy",
        "topic": "Testing this interface",
        "question": "What is your favorite color?",
        "choices": { "A": "Blue", "B": "Red", "C": "Green", "D": "Purple" },
        "answer": "A",
        "explanation": "Blue is a great color. It represents clarity and logic." },
      { "slug": "preview-q2", "question_format": "multiple_choice", "difficulty": "medium",
        "topic": "Code rendering test",
        "question": "Given:\\n\\n<python>\\nparts = ['J23119', 'B0034']\\nmy_copy = parts\\nmy_copy.append('B0015')\\n</python>\\n\\nHow many elements does <python>parts</python> have?",
        "choices": { "A": "2", "B": "3", "C": "Error", "D": "None" },
        "answer": "B",
        "explanation": "Both names refer to the same list object." }
    ],
    "control_flow_and_iteration": [],
    "functions_parameters_and_scope": []
  }
};
"""

# ── Mock google.script.run (no-ops so client JS doesn't crash) ───────────────
MOCK_GAS = """
// ── Error overlay so any JS error is visible on the page ──
window.addEventListener('error', function(e) {
  var d = document.getElementById('_preview-error');
  if (!d) {
    d = document.createElement('div');
    d.id = '_preview-error';
    d.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#c0392b;color:#fff;padding:10px 16px;font:13px monospace;z-index:9999;white-space:pre-wrap;max-height:40vh;overflow-y:auto';
    document.body.appendChild(d);
  }
  d.textContent += (e.filename ? e.filename.split('/').pop() : '?') + ':' + e.lineno + ' — ' + e.message + '\\n';
});

// ── google.script.run stub ──
window.google = window.google || {};
google.script = {
  run: new Proxy({}, {
    get(_, prop) {
      if (prop === 'withSuccessHandler') return function(fn) {
        // Simulate async success with null row number
        setTimeout(function() { try { fn(null); } catch(e) {} }, 0);
        return google.script.run;
      };
      if (prop === 'withFailureHandler') return function(fn) { return google.script.run; };
      return function() {};
    }
  })
};
"""

def read(rel_path):
    with open(os.path.join(SRC, rel_path), 'r') as f:
        return f.read()

def resolve_includes(html):
    """Replace <?!= include('foo'); ?> with the actual file contents."""
    def replacer(m):
        path = m.group(1)
        try:
            return read(path + '.html')
        except FileNotFoundError:
            return f'<!-- missing: {path} -->'
    return re.sub(r"<\?!=\s*include\('([^']+)'\);\s*\?>", replacer, html)

def build():
    index = read('Index.html')

    # Inject mock bootstrap instead of server-side template
    index = re.sub(
        r'window\.BRAINULE_BOOTSTRAP\s*=\s*<\?!=\s*bootstrapData\s*\?>;',
        MOCK_BOOTSTRAP,
        index
    )

    # Inject google.script.run mock right after <body>
    index = index.replace('<body>', '<body>\n<script>' + MOCK_GAS + '</script>')

    # Resolve all include() calls
    index = resolve_includes(index)

    with open(OUT, 'w') as f:
        f.write(index)
    print(f'Built: {OUT}')

def serve():
    os.chdir(os.path.dirname(__file__))
    handler = http.server.SimpleHTTPRequestHandler
    server  = http.server.HTTPServer(('', PORT), handler)
    url     = f'http://localhost:{PORT}/preview.html'
    print(f'Serving at {url}')
    print('Edit src/ files, then press Ctrl+C and re-run to rebuild.')
    threading.Timer(0.5, lambda: webbrowser.open(url)).start()
    server.serve_forever()

if __name__ == '__main__':
    build()
    if '--build' not in sys.argv:
        serve()
