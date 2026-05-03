export const INSTRUCTIONS = `
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
- fetch_webpageで取得したテキストにcompress_textを重ねて使用しないこと（fetch_webpage内部で圧縮済み）
`.trim();
