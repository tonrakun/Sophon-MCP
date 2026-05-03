# Sophon MCP

> **Sophon**（ソフォン）— ギリシャ語 _σοφόν_「賢明なもの」より。
> AI コーディングにおけるコンテキスト制限問題を解決する、軽量・高速な MCP サーバー。

[![npm version](https://img.shields.io/npm/v/sophon-mcp)](https://www.npmjs.com/package/sophon-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 特徴

- **トークン節約** — ファイルを段階的に読み取り、必要な部分だけを AI に渡す
- **プロジェクト単位で動作** — `--root` で指定したディレクトリをスコープとする
- **タスク・記憶の永続管理** — SQLite でタスクやメモをプロジェクトごとに保存
- **Claude Code の標準ツールの代替** — Read File / List Directory 等の代わりに使用可能
- **MCP Instructions による自動誘導** — AI がSophon のツールを優先的に使用するよう指示

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

## ツール一覧

Sophon MCP は以下のツールを提供します。

### ファイル読み取り系

| ツール | 説明 |
| -------- | ------ |
| `read_markdown_toc` | Markdown ファイルの見出し一覧（目次）を返す |
| `read_markdown_section` | 目次の anchor を指定してセクション本文を返す |
| `read_code_skeleton` | コードファイルの関数・クラス一覧をシグネチャのみで返す |
| `read_code_body` | スケルトンの ID を指定して関数本文を返す |
| `read_directory_tree` | `.gitignore` 適用済みのディレクトリツリーを返す |
| `read_git_diff` | 圧縮済みの git diff を返す |
| `search_file` | ファイル内のキーワードマッチ行と前後の文脈を返す |
| `read_json_yaml_keys` | JSON/YAML ファイルのキー構造一覧を返す |
| `read_json_yaml_value` | 指定したキーパスの値を返す |

### テキスト圧縮系

| ツール | 説明 |
| -------- | ------ |
| `compress_text` | テキストから不要な要素を除去・圧縮して返す |

### Web 取得系

| ツール | 説明 |
| -------- | ------ |
| `fetch_webpage` | Web ページを Markdown 変換・圧縮して返す |

### コンテキスト管理系

| ツール | 説明 |
| -------- | ------ |
| `count_tokens` | テキストのトークン数を返す（tiktoken 互換） |
| `summarize_conversation` | 会話履歴を要約して返す |

### 記憶系

| ツール | 説明 |
| -------- | ------ |
| `memory_save` | キーと値を永続保存する |
| `memory_get` | キーで値を取得する |
| `memory_list` | タグ・プレフィックスで記憶一覧を取得する |
| `memory_delete` | キーで記憶を削除する |

### タスク系

| ツール | 説明 |
| -------- | ------ |
| `task_create` | タスクを作成する（サブタスク階層対応） |
| `task_update` | タスクのステータスとメモを更新する |
| `task_get` | タスク ID で詳細を取得する |
| `task_list` | ステータスでフィルタしてタスク一覧を取得する |
| `task_delete` | タスクを削除する |

---

## 使い方

Sophon の設計思想は **「ファイルを段階的に読み取り、必要な部分だけを取得する」** ことです。

### Markdown ファイルの読み取り

```text
1. read_markdown_toc で目次を取得
2. 必要なセクションの anchor を特定
3. read_markdown_section で該当セクションだけを取得
```

### コードファイルの読み取り

```text
1. read_code_skeleton で関数・クラス一覧を取得
2. 必要な関数の ID を特定
3. read_code_body で該当関数の本文だけを取得
```

### JSON/YAML ファイルの読み取り

```text
1. read_json_yaml_keys でキー構造を取得
2. 必要なキーパスを特定
3. read_json_yaml_value で該当値だけを取得
```

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