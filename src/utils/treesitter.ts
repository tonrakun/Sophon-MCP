import Parser from "web-tree-sitter";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export type SkeletonType = "function" | "class" | "method" | "if" | "for" | "while";

export interface SkeletonEntry {
  id: string;
  type: SkeletonType;
  name?: string;
  signature?: string;
  start_line: number;
  end_line: number;
}

const EXT_TO_LANG: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "tsx",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".cs": "c_sharp",
  ".rb": "ruby",
  ".php": "php",
  ".kt": "kotlin",
  ".swift": "swift",
};

export function detectLanguage(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_TO_LANG[ext] ?? null;
}

// dist/utils/treesitter.js → dist/utils → dist → projectRoot
const _pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const _wtsDir = path.join(_pkgRoot, "node_modules", "web-tree-sitter");
const _wasmGrammarDir = path.join(_pkgRoot, "node_modules", "tree-sitter-wasms", "out");

let _inited = false;
let _initPromise: Promise<void> | null = null;
const _parsers = new Map<string, Parser>();

async function ensureInit(): Promise<void> {
  if (_inited) return;
  if (_initPromise) { await _initPromise; return; }
  _initPromise = (async () => {
    await Parser.init({
      locateFile(name: string) { return path.join(_wtsDir, name); },
    });
    _inited = true;
  })();
  await _initPromise;
}

async function getParser(langId: string): Promise<Parser | null> {
  await ensureInit();
  if (_parsers.has(langId)) return _parsers.get(langId)!;
  try {
    const wasmDir = _wasmGrammarDir;
    const wasmFile = path.join(wasmDir, `tree-sitter-${langId}.wasm`);
    if (!fs.existsSync(wasmFile)) return null;
    const lang = await Parser.Language.load(wasmFile);
    const parser = new Parser();
    parser.setLanguage(lang);
    _parsers.set(langId, parser);
    return parser;
  } catch {
    return null;
  }
}

type SN = Parser.SyntaxNode;
type Entries = SkeletonEntry[];

function makeEntry(node: SN, type: SkeletonType, name: string | undefined): SkeletonEntry {
  const start_line = node.startPosition.row + 1;
  const end_line = node.endPosition.row + 1;
  const prefix = type === "class" ? "class" : type === "method" ? "method" : "func";
  const id = `${prefix}:${start_line}-${end_line}`;
  const signature = node.text.split("\n")[0].trim().replace(/\{?\s*$/, "").trim();
  return { id, type, name, signature, start_line, end_line };
}

function fieldText(node: SN, field: string): string | undefined {
  return node.childForFieldName(field)?.text ?? undefined;
}

// ── TypeScript / JavaScript / TSX ──────────────────────────────────────────

function traverseTS(node: SN, entries: Entries, insideClass: boolean): void {
  const t = node.type;

  if (t === "class_declaration" || t === "abstract_class_declaration" || t === "class") {
    entries.push(makeEntry(node, "class", fieldText(node, "name")));
    const body = node.childForFieldName("body") ?? node.children.find((c) => c.type === "class_body");
    if (body) for (const c of body.namedChildren) traverseTS(c, entries, true);
    return;
  }

  if (t === "function_declaration" || t === "generator_function_declaration") {
    entries.push(makeEntry(node, insideClass ? "method" : "function", fieldText(node, "name")));
    return;
  }

  if (t === "method_definition" || t === "abstract_method_signature" || t === "method_signature") {
    entries.push(makeEntry(node, "method", fieldText(node, "name")));
    return;
  }

  if (t === "variable_declarator") {
    const value = node.childForFieldName("value");
    if (value && (value.type === "arrow_function" || value.type === "function_expression" || value.type === "generator_function")) {
      entries.push(makeEntry(node, insideClass ? "method" : "function", fieldText(node, "name")));
    }
    return;
  }

  const TS_WRAPPERS = new Set([
    "export_statement", "lexical_declaration", "variable_declaration",
    "ambient_declaration", "internal_module", "module", "namespace_body",
  ]);
  if (TS_WRAPPERS.has(t) || t === "program") {
    for (const c of node.namedChildren) traverseTS(c, entries, insideClass);
  }
}

// ── Python ─────────────────────────────────────────────────────────────────

function traversePy(node: SN, entries: Entries, insideClass: boolean): void {
  const t = node.type;

  if (t === "class_definition") {
    entries.push(makeEntry(node, "class", fieldText(node, "name")));
    const body = node.childForFieldName("body");
    if (body) for (const c of body.namedChildren) traversePy(c, entries, true);
    return;
  }

  if (t === "function_definition" || t === "async_function_definition") {
    entries.push(makeEntry(node, insideClass ? "method" : "function", fieldText(node, "name")));
    return;
  }

  if (t === "decorated_definition") {
    const def = node.children.find(
      (c) => c.type === "function_definition" || c.type === "class_definition" || c.type === "async_function_definition"
    );
    if (def) traversePy(def, entries, insideClass);
    return;
  }

  if (t === "module") for (const c of node.namedChildren) traversePy(c, entries, false);
}

// ── Go ─────────────────────────────────────────────────────────────────────

function traverseGo(node: SN, entries: Entries): void {
  const t = node.type;

  if (t === "function_declaration") {
    entries.push(makeEntry(node, "function", fieldText(node, "name")));
    return;
  }
  if (t === "method_declaration") {
    entries.push(makeEntry(node, "method", fieldText(node, "name")));
    return;
  }
  if (t === "type_declaration") {
    for (const spec of node.namedChildren) {
      if (spec.type === "type_spec") {
        entries.push(makeEntry(node, "class", fieldText(spec, "name")));
      }
    }
    return;
  }
  if (t === "source_file") for (const c of node.namedChildren) traverseGo(c, entries);
}

// ── Rust ───────────────────────────────────────────────────────────────────

function traverseRust(node: SN, entries: Entries, insideImpl: boolean): void {
  const t = node.type;

  if (t === "function_item") {
    entries.push(makeEntry(node, insideImpl ? "method" : "function", fieldText(node, "name")));
    return;
  }
  if (t === "struct_item" || t === "enum_item" || t === "trait_item" || t === "union_item") {
    entries.push(makeEntry(node, "class", fieldText(node, "name")));
    return;
  }
  if (t === "impl_item") {
    const typeName = node.childForFieldName("type")?.text;
    entries.push(makeEntry(node, "class", typeName));
    const body = node.childForFieldName("body");
    if (body) for (const c of body.namedChildren) traverseRust(c, entries, true);
    return;
  }
  if (t === "source_file") for (const c of node.namedChildren) traverseRust(c, entries, false);
}

// ── Java ───────────────────────────────────────────────────────────────────

function traverseJava(node: SN, entries: Entries): void {
  const t = node.type;
  const CLASS_NODES = new Set(["class_declaration", "interface_declaration", "enum_declaration", "record_declaration", "annotation_type_declaration"]);

  if (CLASS_NODES.has(t)) {
    entries.push(makeEntry(node, "class", fieldText(node, "name")));
    const body = node.childForFieldName("body") ?? node.children.find((c) => c.type.endsWith("_body"));
    if (body) for (const c of body.namedChildren) traverseJava(c, entries);
    return;
  }
  if (t === "method_declaration" || t === "constructor_declaration") {
    entries.push(makeEntry(node, "method", fieldText(node, "name")));
    return;
  }
  if (t === "program") for (const c of node.namedChildren) traverseJava(c, entries);
}

// ── C / C++ ────────────────────────────────────────────────────────────────

function extractCName(node: SN | null): string | undefined {
  if (!node) return undefined;
  if (node.type === "identifier") return node.text;
  const inner = node.childForFieldName("declarator");
  return extractCName(inner ?? null);
}

function traverseC(node: SN, entries: Entries, langId: string): void {
  const t = node.type;

  if (t === "function_definition") {
    const name = extractCName(node.childForFieldName("declarator") ?? null);
    entries.push(makeEntry(node, "function", name));
    return;
  }
  if (t === "struct_specifier" || t === "union_specifier") {
    const name = fieldText(node, "name");
    if (name) entries.push(makeEntry(node, "class", name));
    return;
  }
  if (langId === "cpp" && t === "class_specifier") {
    entries.push(makeEntry(node, "class", fieldText(node, "name")));
    const body = node.childForFieldName("body");
    if (body) {
      for (const c of body.namedChildren) {
        if (c.type === "function_definition") {
          entries.push(makeEntry(c, "method", extractCName(c.childForFieldName("declarator") ?? null)));
        }
      }
    }
    return;
  }
  if (t === "translation_unit") for (const c of node.namedChildren) traverseC(c, entries, langId);
}

// ── C# ─────────────────────────────────────────────────────────────────────

function traverseCS(node: SN, entries: Entries, insideClass: boolean): void {
  const t = node.type;
  const CLASS_NODES = new Set(["class_declaration", "interface_declaration", "struct_declaration", "enum_declaration", "record_declaration"]);

  if (CLASS_NODES.has(t)) {
    entries.push(makeEntry(node, "class", fieldText(node, "name")));
    const body = node.childForFieldName("body") ?? node.children.find((c) => c.type === "declaration_list");
    if (body) for (const c of body.namedChildren) traverseCS(c, entries, true);
    return;
  }
  if (t === "method_declaration" || t === "constructor_declaration" || t === "local_function_statement") {
    entries.push(makeEntry(node, insideClass ? "method" : "function", fieldText(node, "name")));
    return;
  }
  if (t === "namespace_declaration") {
    const body = node.childForFieldName("body") ?? node.children.find((c) => c.type === "declaration_list");
    if (body) for (const c of body.namedChildren) traverseCS(c, entries, false);
    return;
  }
  if (t === "compilation_unit") for (const c of node.namedChildren) traverseCS(c, entries, false);
}

// ── Ruby ───────────────────────────────────────────────────────────────────

function traverseRuby(node: SN, entries: Entries, insideClass: boolean): void {
  const t = node.type;

  if (t === "class" || t === "module") {
    const nameNode = node.childForFieldName("name") ?? node.children.find((c) => c.type === "constant" || c.type === "scope_resolution");
    entries.push(makeEntry(node, "class", nameNode?.text));
    const body = node.childForFieldName("body") ?? node.children.find((c) => c.type === "body_statement");
    if (body) for (const c of body.namedChildren) traverseRuby(c, entries, true);
    return;
  }
  if (t === "method" || t === "singleton_method") {
    entries.push(makeEntry(node, insideClass ? "method" : "function", fieldText(node, "name")));
    return;
  }
  if (t === "program") for (const c of node.namedChildren) traverseRuby(c, entries, false);
}

// ── PHP ────────────────────────────────────────────────────────────────────

function traversePHP(node: SN, entries: Entries, insideClass: boolean): void {
  const t = node.type;

  if (t === "class_declaration" || t === "interface_declaration" || t === "trait_declaration") {
    entries.push(makeEntry(node, "class", fieldText(node, "name")));
    const body = node.childForFieldName("body") ?? node.children.find((c) => c.type === "declaration_list");
    if (body) for (const c of body.namedChildren) traversePHP(c, entries, true);
    return;
  }
  if (t === "function_definition" || t === "method_declaration") {
    entries.push(makeEntry(node, insideClass || t === "method_declaration" ? "method" : "function", fieldText(node, "name")));
    return;
  }
  if (t === "program") for (const c of node.namedChildren) traversePHP(c, entries, false);
}

// ── Kotlin ─────────────────────────────────────────────────────────────────

function traverseKotlin(node: SN, entries: Entries, insideClass: boolean): void {
  const t = node.type;

  if (t === "class_declaration" || t === "object_declaration" || t === "interface_declaration") {
    const name = fieldText(node, "name") ?? node.children.find((c) => c.type === "type_identifier" || c.type === "simple_identifier")?.text;
    entries.push(makeEntry(node, "class", name));
    const body = node.childForFieldName("body") ?? node.children.find((c) => c.type === "class_body");
    if (body) for (const c of body.namedChildren) traverseKotlin(c, entries, true);
    return;
  }
  if (t === "function_declaration") {
    const name = fieldText(node, "name") ?? node.children.find((c) => c.type === "simple_identifier")?.text;
    entries.push(makeEntry(node, insideClass ? "method" : "function", name));
    return;
  }
  if (t === "source_file") for (const c of node.namedChildren) traverseKotlin(c, entries, false);
}

// ── Swift ──────────────────────────────────────────────────────────────────

function traverseSwift(node: SN, entries: Entries, insideClass: boolean): void {
  const t = node.type;
  const CLASS_NODES = new Set(["class_declaration", "struct_declaration", "protocol_declaration", "enum_declaration", "extension_declaration"]);

  if (CLASS_NODES.has(t)) {
    const name = node.children.find((c) => c.type === "type_identifier" || c.type === "simple_identifier")?.text;
    entries.push(makeEntry(node, "class", name));
    const body = node.children.find((c) => c.type === "class_body" || c.type === "enum_class_body");
    if (body) for (const c of body.namedChildren) traverseSwift(c, entries, true);
    return;
  }
  if (t === "function_declaration" || t === "init_declaration" || t === "deinit_declaration") {
    const name = node.children.find((c) => c.type === "simple_identifier")?.text;
    entries.push(makeEntry(node, insideClass ? "method" : "function", name));
    return;
  }
  if (t === "source_file") for (const c of node.namedChildren) traverseSwift(c, entries, false);
}

// ── Dispatch ───────────────────────────────────────────────────────────────

function extractSkeleton(root: SN, langId: string): SkeletonEntry[] {
  const entries: Entries = [];
  switch (langId) {
    case "typescript": case "tsx": case "javascript":
      traverseTS(root, entries, false); break;
    case "python":
      traversePy(root, entries, false); break;
    case "go":
      traverseGo(root, entries); break;
    case "rust":
      traverseRust(root, entries, false); break;
    case "java":
      traverseJava(root, entries); break;
    case "c": case "cpp":
      traverseC(root, entries, langId); break;
    case "c_sharp":
      traverseCS(root, entries, false); break;
    case "ruby":
      traverseRuby(root, entries, false); break;
    case "php":
      traversePHP(root, entries, false); break;
    case "kotlin":
      traverseKotlin(root, entries, false); break;
    case "swift":
      traverseSwift(root, entries, false); break;
  }
  return entries;
}

export async function parseCodeSkeleton(
  filePath: string,
  content: string,
): Promise<SkeletonEntry[] | null> {
  const langId = detectLanguage(filePath);
  if (!langId) return null;

  const parser = await getParser(langId);
  if (!parser) return null;

  const tree = parser.parse(content);
  if (!tree) return null;
  return extractSkeleton(tree.rootNode, langId);
}
