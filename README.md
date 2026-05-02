# Sophon MCP 要件定義書

> **Sophon**（ソフォン）— ギリシャ語 _σοφόν_「賢明なもの」より。  
> AIコーディングにおけるコンテキスト制限問題を解決する、軽量・高速なMCPサーバー。

---

## 1. プロジェクト概要

### 背景

LLMを用いたAIコーディング（Claude Code等）において、コンテキストウィンドウの制限は最重要課題のひとつである。ファイル全体・ディレクトリツリー・APIレスポンスをそのままAIに渡すと、トークンを大量消費し、精度低下・コスト増加・処理速度の低下を招く。

Sophon MCPはこの問題を解決するため、**必要な情報だけを必要なタイミングで渡す**設計思想のもと構築される。

### 目標

- AIに渡すトークン量を最小化する
- プロジェクト単位で動作し、タスク・記憶を永続管理する
- Claude Codeの標準ツール（Read File / List Directory等）の代替として機能する

---

## 2. 基本仕様

| 項目 | 内容 |
| --- | --- |
| パッケージ名 | `sophon-mcp` |
| 言語 | TypeScript |
| 永続化 | better-sqlite3 |
| 配布方法 | npm（`npx sophon-mcp`） |
| 動作単位 | プロジェクト単位（`--root` 指定） |
| データ保存先 | `{project_root}/.sophon/` |

### MCP設定例

```json
{
  "mcpServers": {
    "sophon": {
      "command": "npx",
      "args": ["sophon-mcp", "--root", "/path/to/your/project"]
    }
  }
}
```

### 設計方針

- `--root` で指定したディレクトリ外へのアクセスは禁止
- Claude Codeの標準ファイル系ツールを使わずSophonを優先使用するよう、MCPのinstructionsで誘導する
- 全ツールのレスポンスに `token_count` を付与し、削減効果を可視化する

---

## 3. ツール一覧

### 3-1. ファイル読み取り系

#### `read_markdown_toc`

マークダウンファイルの目次（見出し一覧）のみを返す。

```typescript
// Request
{ path: string }

// Response
{
  toc: { level: number, title: string, anchor: string }[],
  token_count: number
}
```

---

#### `read_markdown_section`

目次から選択したセクションのテキストのみを返す。

```typescript
// Request
{ path: string, anchors: string[] }

// Response
{
  sections: { anchor: string, content: string }[],
  token_count: number
}
```

---

#### `read_code_skeleton`

コードファイルの関数・クラス・ブロック構造一覧を返す。

```typescript
// Request
{ path: string, include_blocks?: boolean }
// include_blocks: trueでif/for等のブロックも含む（デフォルト: false）

// Response
{
  skeleton: {
    id: string,
    type: "function" | "class" | "method" | "if" | "for" | "while",
    name?: string,
    signature?: string,
    start_line: number,
    end_line: number
  }[],
  token_count: number
}
```

---

#### `read_code_body`

スケルトンから選択した関数・ブロックの本文のみを返す。

```typescript
// Request
{ path: string, ids: string[] }

// Response
{
  blocks: { id: string, name?: string, body: string }[],
  token_count: number
}
```

---

#### `read_directory_tree`

`.gitignore` を適用した軽量なディレクトリツリーを返す。

```typescript
// Request
{ path?: string, depth?: number }
// path: --root からの相対パス（省略時はroot）
// depth: 最大深さ（デフォルト: 3）

// Response
{
  tree: string,
  token_count: number
}
```

---

#### `read_git_diff`

圧縮済みの git diff を返す。

```typescript
// Request
{ path?: string, from?: string, to?: string }
// from/to: コミットハッシュ・ブランチ名（省略時は HEAD との差分）

// Response
{
  diff: string,
  token_count: number
}
```

---

#### `search_file`

ファイル内のキーワードマッチ行のみを返す。

```typescript
// Request
{ path: string, query: string, context_lines?: number }
// context_lines: マッチ行の前後に含める行数（デフォルト: 2）

// Response
{
  matches: { line: number, content: string, context: string[] }[],
  token_count: number
}
```

---

#### `read_json_yaml_keys`

JSONまたはYAMLファイルのキー一覧のみを返す。

```typescript
// Request
{ path: string, depth?: number }

// Response
{
  keys: { path: string, type: string, preview?: string }[],
  token_count: number
}
```

---

#### `read_json_yaml_value`

指定したキーパスの値のみを返す。

```typescript
// Request
{ path: string, key_paths: string[] }

// Response
{
  values: { key_path: string, value: unknown }[],
  token_count: number
}
```

---

### 3-2. テキスト圧縮系

#### `compress_text`

テキストから不要な要素を除去・圧縮して返す。オプションで処理内容を制御する。

```typescript
// Request
{
  text: string,
  options?: {
    remove_markdown_noise?: boolean,   // ---罫線・HTMLコメント・バッジ画像等を除去
    remove_code_comments?: boolean,    // コードコメント（// /* */ #）を除去
    remove_duplicate_lines?: boolean,  // 連続する重複行を圧縮
    normalize_whitespace?: boolean,    // 連続空行・余分なスペースを正規化
    trim_tool_response?: boolean       // null・空配列・長いURLを除去
  }
}

// Response
{
  compressed: string,
  original_token_count: number,
  compressed_token_count: number,
  saved_tokens: number,
  saved_tokens_detail: {
    markdown_noise: number,
    code_comments: number,
    duplicate_lines: number,
    whitespace: number,
    tool_response: number
  }
}
```

---

### 3-3. Web取得系

#### `fetch_webpage`

WebページをMD変換・圧縮して返す。

```typescript
// Request
{ url: string, compress?: boolean }
// compress: trueでcompress_textのデフォルトオプションを適用（デフォルト: true）

// Response
{
  markdown: string,
  original_token_count: number,
  compressed_token_count: number,
  saved_tokens: number
}
```

処理パイプライン：

```text
HTTP取得 → HTML本文抽出（Readability的） → MD変換 → compress_text適用
```

---

### 3-4. コンテキスト管理系

#### `count_tokens`

テキストのトークン数を返す。

```typescript
// Request
{ text: string }

// Response
{ tokens: number }
```

tiktoken互換（cl100k_base）で計算。

---

#### `summarize_conversation`

会話履歴をシンプルに要約して返す。

```typescript
// Request
{
  messages: { role: "user" | "assistant", content: string }[],
  max_tokens?: number  // 要約の最大トークン数（デフォルト: 500）
}

// Response
{
  summary: string,
  original_tokens: number,
  summary_tokens: number,
  saved_tokens: number
}
```

---

### 3-5. 記憶系

#### `memory_save`

キーと値を永続保存する。

```typescript
// Request
{ key: string, value: unknown, tags?: string[] }

// Response
{ key: string, saved_at: string }
```

---

#### `memory_get`

キーで値を取得する。

```typescript
// Request
{ key: string }

// Response
{ key: string, value: unknown, tags: string[], saved_at: string }
```

---

#### `memory_list`

タグ・プレフィックスで記憶一覧を取得する。

```typescript
// Request
{ tags?: string[], prefix?: string }

// Response
{ memories: { key: string, tags: string[], saved_at: string }[] }
```

---

#### `memory_delete`

キーで記憶を削除する。

```typescript
// Request
{ key: string }

// Response
{ key: string, deleted: boolean }
```

---

### 3-6. タスク系

#### `task_create`

タスクを作成する。`parent_id` でサブタスク階層に対応。

```typescript
// Request
{ title: string, description?: string, parent_id?: string }

// Response
{ id: string, title: string, status: "todo", created_at: string }
```

---

#### `task_update`

タスクのステータスとメモを更新する。

```typescript
// Request
{ id: string, status?: "todo" | "in_progress" | "done" | "blocked", note?: string }

// Response
{ id: string, status: string, updated_at: string }
```

---

#### `task_get`

タスクIDで詳細を取得する。

```typescript
// Request
{ id: string }

// Response
{
  id: string,
  title: string,
  description?: string,
  status: string,
  note?: string,
  parent_id?: string,
  children: { id: string, title: string, status: string }[],
  created_at: string,
  updated_at: string
}
```

---

#### `task_list`

ステータスでフィルタしてタスク一覧を取得する。

```typescript
// Request
{ status?: "todo" | "in_progress" | "done" | "blocked" }

// Response
{ tasks: { id: string, title: string, status: string, parent_id?: string }[] }
```

---

#### `task_delete`

タスクを削除する。

```typescript
// Request
{ id: string }

// Response
{ id: string, deleted: boolean }
```

---

## 4. 後回し機能

以下は設計確定済みだが実装を後回しにする機能。

| 機能 | 概要 |
| --- | --- |
| `semantic_search` | 埋め込みモデルを使ったファイル内セマンティック検索。使用モデルは未定（ローカル or OpenAI系）。 |

---

## 5. データ構造（SQLite）

```text
.sophon/
  sophon.db   ← better-sqlite3で管理
```

### テーブル構成

```sql
-- 記憶
CREATE TABLE memories (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,  -- JSON文字列
  tags       TEXT,           -- JSON配列文字列
  saved_at   TEXT NOT NULL
);

-- タスク
CREATE TABLE tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo',
  note        TEXT,
  parent_id   TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES tasks(id)
);
```

---

## 6. セキュリティ

- `--root` で指定したディレクトリ外へのパス解決は禁止（パストラバーサル対策）
- シンボリックリンクのroot外への追跡は禁止

---

## 7. Claude Code誘導方針

### 7-1. MCP Instructions（全文）

MCPサーバー起動時に `server.setInstructions()` で設定する。AIが最初に読む行動指針。

```markdown
# Sophon MCP 使用ルール

あなたはsophon-mcpを通じてプロジェクトファイルにアクセスする。
以下のルールを必ず守ること。

## 基本ルール
- ファイル読み取り・ディレクトリ探索には必ずsophon-mcpのツールを使用すること
- Claude Codeの標準ツール（Read File / List Directory / Bash等）でのファイル読み取りは禁止
- Webページの取得にはfetch_webpageを使用すること

## ファイル読み取り手順
- Markdownファイル: read_markdown_toc → 必要セクションをread_markdown_sectionで取得
- コードファイル: read_code_skeleton → 必要関数をread_code_bodyで取得
- JSON/YAMLファイル: read_json_yaml_keys → 必要値をread_json_yaml_valueで取得
- ファイル全体を一度に読み取ることは禁止。必ず上記の段階的手順を踏むこと

## タスク管理
- 作業開始時はtask_listで既存タスクを確認すること
- 新しい作業はtask_createでタスクを作成してから着手すること
- 作業状況が変わるたびにtask_updateでステータスを更新すること

## 記憶管理
- プロジェクト固有の重要情報（設計決定・注意事項等）はmemory_saveで保存すること
- 作業開始時はmemory_listで既存の記憶を確認すること

## トークン節約
- 大きなレスポンスはcompress_textで圧縮してから処理すること
- count_tokensで渡す前にトークン数を確認すること
```

---

### 7-2. 各ツールのdescription定義

実装時に `server.tool()` の第2引数に設定する文言。

| ツール | description |
| --- | --- |
| `read_markdown_toc` | Markdownファイルの見出し一覧（目次）のみを返す。ファイル全体を読む前に必ずこれを使い、必要なセクションを特定すること。 |
| `read_markdown_section` | read_markdown_tocで取得した目次のanchorを指定し、該当セクションのテキストのみを返す。必要なセクションだけを選んで取得すること。 |
| `read_code_skeleton` | コードファイルの関数・クラス・メソッドの一覧をシグネチャのみで返す。コードを読む前に必ずこれを使い、必要な関数を特定すること。 |
| `read_code_body` | read_code_skeletonで取得したIDを指定し、該当関数・ブロックの本文のみを返す。必要な関数だけを選んで取得すること。 |
| `read_directory_tree` | .gitignoreを適用したディレクトリツリーを返す。node_modules等は自動除外。プロジェクト構造把握に使用すること。 |
| `read_git_diff` | 圧縮済みのgit diffを返す。変更内容の確認に使用すること。 |
| `search_file` | ファイル内のキーワードにマッチした行と前後の文脈のみを返す。特定の処理を探すときに使用すること。 |
| `read_json_yaml_keys` | JSON/YAMLファイルのキー構造一覧のみを返す。ファイル全体を読む前に必ずこれを使い、必要なキーを特定すること。 |
| `read_json_yaml_value` | read_json_yaml_keysで特定したキーパスの値のみを返す。必要な値だけを選んで取得すること。 |
| `compress_text` | テキストからMarkdownノイズ・コードコメント・重複行・余分な空白を除去して圧縮する。大きなテキストをAIに渡す前に使用すること。 |
| `fetch_webpage` | WebページをMarkdownに変換・圧縮して返す。Webページの取得には必ずこれを使うこと。 |
| `count_tokens` | テキストのトークン数をtiktoken互換（cl100k_base）で返す。大きなテキストを渡す前に確認すること。 |
| `summarize_conversation` | 会話履歴を要約して返す。長い会話履歴を渡す前に使用すること。 |
| `memory_save` | プロジェクト固有の情報（設計決定・注意事項・発見した仕様等）をキーと値で永続保存する。 |
| `memory_get` | キーを指定して保存済みの記憶を取得する。 |
| `memory_list` | 保存済みの記憶一覧をタグ・プレフィックスでフィルタして取得する。作業開始時に必ず確認すること。 |
| `memory_delete` | キーを指定して記憶を削除する。 |
| `task_create` | タスクを作成する。新しい作業を始める前に必ずタスクを作成すること。parent_idでサブタスク階層に対応。 |
| `task_update` | タスクのステータス（todo/in_progress/done/blocked）とメモを更新する。作業状況が変わるたびに更新すること。 |
| `task_get` | タスクIDで詳細とサブタスク一覧を取得する。 |
| `task_list` | タスク一覧をステータスでフィルタして取得する。作業開始時に必ず確認すること。 |
| `task_delete` | タスクを削除する。 |
