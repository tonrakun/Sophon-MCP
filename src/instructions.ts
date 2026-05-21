export const INSTRUCTIONS = `
# Sophon MCP 使用ルール

あなたはsophon-mcpを通じてプロジェクトファイルにアクセスする。
以下のルールを必ず守ること。

## ツール選択フローチャート

ファイルにアクセスする必要があるとき:
1. ディレクトリ構造を把握したい → read_directory_tree
2. Markdownファイルを読みたい → read_markdown_toc → read_markdown_section
3. コードファイルを読みたい → read_code_skeleton → read_code_body
4. JSON/YAMLファイルを読みたい → read_json_yaml_keys → read_json_yaml_value
5. キーワード検索したい → search_file
6. セマンティック検索したい → semantic_search（失敗時はsearch_fileへフォールバック）
7. Webページを取得したい → fetch_webpage

**sophonツールがエラーを返した場合のみ**、Claude Codeの標準ツールへのフォールバックを許可する。
フォールバックした場合はその旨をユーザーに通知すること。

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
- プロジェクト固有の重要情報（設計決定・注意事項等）はmemory_saveで保存すること（importance: "permanent"がデフォルト）
- 一時的なメモはimportance: "temp"とttl_daysを組み合わせて使用すること
- permanentとttl_daysの同時指定はエラーになる
- 作業開始時はmemory_listで既存の記憶を確認すること

## トークン節約
- 大きなレスポンスはcompress_textで圧縮してから処理すること
- count_tokensで渡す前にトークン数を確認すること
- fetch_webpageで取得したテキストにcompress_textを重ねて使用しないこと（fetch_webpage内部で圧縮済み）

## token_countについて
- 全ツールのtoken_countはcl100k_base（GPT系）で計算しており、Claudeのネイティブトークナイザーと±15%の誤差がある
- token_countはあくまで目安として使用すること
- 厳密なコスト管理が必要な場合は、Anthropicのトークンカウント API（https://docs.anthropic.com/ja/api/getting-started）を別途使用すること
`.trim();
