# Sophon MCP

> **Sophon**（ソフォン）— ギリシャ語 _σοφόν_「賢明なもの」より。
> AI コーディングにおけるコンテキスト制限問題を解決する、軽量・高速な MCP サーバー。

[![npm version](https://img.shields.io/npm/v/sophon-mcp)](https://www.npmjs.com/package/sophon-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## なぜ Sophon が必要か

Claude Code 等の AI コーディングツールは、標準の `Read File` でファイルをそのままコンテキストに流し込みます。`package-lock.json` 1 ファイルだけで **88,759 トークン**（≈ $0.27 / 回）を消費することもあります。

Sophon は「**構造を先に取得し、必要な部分だけを取得する**」設計思想で、これを解決します。

### 実測パフォーマンス（Next.js プロジェクトでのベンチマーク）

| ユースケース | 標準 | Sophon | 削減率 |
|---|---|---|---|
| `package-lock.json` キー構造取得 | 88,759t | 6,573t | **92.6%** |
| `package.json` の scripts だけ取得 | 187t | 29t | **84.5%** |
| `README.md` の目次取得 | 360t | 91t | **74.7%** |
| 大規模 API レスポンス圧縮（null 除去） | 1,549t | 377t | **75.7%** |
| キーワード検索（少数マッチ） | 836t | 30t | **96.4%** |
| プロジェクト初期調査（4 ファイル横断） | 1,588t | 804t | **49.4%** |

> 実用的な削減率は**約 40%**（大規模 JSON ファイルを含む場合は 86.8%）。  
> 詳細は [ベンチマーク論文](.paper/sophon-mcp-paper-2026-05-06.md) を参照。

---

## 特徴

- **トークン節約** — ファイルを段階的に読み取り、必要な部分だけを AI に渡す
- **プロジェクト単位で動作** — `--root` で指定したディレクトリをスコープとする
- **タスク・記憶の永続管理** — SQLite でタスクやメモをプロジェクトごとに保存
- **Claude Code の標準ツールの代替** — Read File / List Directory 等の代わりに使用可能
- **MCP Instructions による自動誘導** — AI が Sophon のツールを優先的に使用するよう指示

---

## インストール

```bash
npm install -g sophon-mcp
```

または `npx` で直接起動できます：

```bash
npx sophon-mcp --root /path/to/your/project
```

**動作要件:** Node.js >= 18.0.0

---

## 設定

### Claude Code（`.mcp.json`）

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

### Claude Desktop（`claude_desktop_config.json`）

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

---

## 使い方

Sophon の設計思想は **「ファイルを段階的に読み取り、必要な部分だけを取得する」** ことです。

### Markdown ファイルの読み取り（最大 74.7% 削減）

```text
1. read_markdown_toc で目次を取得
2. 必要なセクションの anchor を特定
3. read_markdown_section で該当セクションだけを取得
```

### コードファイルの読み取り（最大 41.7% 削減）

```text
1. read_code_skeleton で関数・クラス一覧を取得
2. 必要な関数の ID を特定
3. read_code_body で該当関数の本文だけを取得
```

### JSON/YAML ファイルの読み取り（最大 92.6% 削減）

```text
1. read_json_yaml_keys でキー構造を取得
2. 必要なキーパスを特定
3. read_json_yaml_value で該当値だけを取得
```

> **注意:** ファイルが 300 トークン未満の場合、`read_json_yaml_keys` はキー構造ではなく `raw_content` フィールドに生コンテンツを返します。この場合は `read_json_yaml_value` を呼ばずに直接利用してください。

---

## ツール一覧

### ファイル読み取り系

| ツール | 説明 |
|---|---|
| `read_markdown_toc` | Markdown ファイルの見出し一覧（目次）を返す |
| `read_markdown_section` | 目次の anchor を指定してセクション本文を返す |
| `read_code_skeleton` | コードファイルの関数・クラス一覧をシグネチャのみで返す |
| `read_code_body` | スケルトンの ID を指定して関数本文を返す |
| `read_directory_tree` | `.gitignore` 適用済みのディレクトリツリーを返す |
| `read_git_diff` | 圧縮済みの git diff を返す |
| `search_file` | ファイル内のキーワードマッチ行と前後の文脈を返す |
| `read_json_yaml_keys` | JSON/YAML ファイルのキー構造一覧を返す（小ファイルは生コンテンツを直接返す） |
| `read_json_yaml_value` | 指定したキーパスの値を返す |

### テキスト圧縮系

| ツール | 説明 |
|---|---|
| `compress_text` | テキストから不要な要素を除去・圧縮して返す |

### Web 取得系

| ツール | 説明 |
|---|---|
| `fetch_webpage` | Web ページを Markdown 変換・圧縮して返す |

### コンテキスト管理系

| ツール | 説明 |
|---|---|
| `count_tokens` | テキストのトークン数を返す（tiktoken 互換） |
| `summarize_conversation` | 会話履歴を要約して返す |
| `semantic_search` | コードファイルをクエリの意味で検索し、関連する関数・クラスを返す |

### 記憶系

| ツール | 説明 |
|---|---|
| `memory_save` | キーと値を永続保存する |
| `memory_get` | キーで値を取得する |
| `memory_list` | タグ・プレフィックスで記憶一覧を取得する |
| `memory_delete` | キーで記憶を削除する |

### タスク系

| ツール | 説明 |
|---|---|
| `task_create` | タスクを作成する（サブタスク階層対応） |
| `task_update` | タスクのステータスとメモを更新する |
| `task_get` | タスク ID で詳細を取得する |
| `task_list` | ステータスでフィルタしてタスク一覧を取得する |
| `task_delete` | タスクを削除する |

---

## パフォーマンス特性

Sophon のツールは **ファイル・差分が大きいほど効果的** です。小規模なデータに適用すると、構造化レスポンスのオーバーヘッドが削減分を上回る場合があります。

| ツール | 有効になる閾値 | 小規模時の挙動 |
|---|---|---|
| `read_directory_tree` | ファイル数 ≥ 30 | `token_count` を省略（0 を返す） |
| `read_json_yaml_keys` | ファイル ≥ 300 トークン | `raw_content` に生コンテンツを返す |
| `read_git_diff` | 変更行数 ≥ 20 行 | `## Summary` 統計を省略 |
| `read_markdown_section` | 必要なセクションのみ指定 | 全 anchor 指定は JSON ラッパー分が増加 |

---

## データ保存先

Sophon はプロジェクトルート直下の `.sophon/` ディレクトリにデータを保存します。

```text
.sophon/
  sophon.db   ← SQLite データベース（記憶・タスク）
```

> **ヒント:** `.sophon/` を `.gitignore` に追加することを推奨します。

---

## セキュリティ

- `--root` で指定したディレクトリ外へのパス解決は禁止（パストラバーサル対策）
- シンボリックリンクの root 外への追跡は禁止
- `fetch_webpage` は外部 URL を対象とするため、root 制約の適用外

---

## ライセンス

[MIT](LICENSE) © Tonrakun