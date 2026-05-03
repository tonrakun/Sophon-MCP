import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readDirectoryTree } from "./file/read_directory_tree.js";
import { readMarkdownToc } from "./file/read_markdown_toc.js";
import { readMarkdownSection } from "./file/read_markdown_section.js";
import { readCodeSkeleton } from "./file/read_code_skeleton.js";
import { readCodeBody } from "./file/read_code_body.js";
import { searchFile } from "./file/search_file.js";
import { readGitDiff } from "./file/read_git_diff.js";
import { readJsonYamlKeys } from "./file/read_json_yaml_keys.js";
import { readJsonYamlValue } from "./file/read_json_yaml_value.js";

export function registerFileTools(server: McpServer): void {
  server.tool(
    "read_directory_tree",
    ".gitignoreを適用したディレクトリツリーを返す。node_modules等は自動除外。プロジェクト構造把握に使用すること。",
    {
      path: z.string().optional().describe("プロジェクトルートからの相対パス（省略時はroot）"),
      depth: z.number().int().min(1).max(10).optional().describe("最大深さ（デフォルト: 3）"),
    },
    async ({ path, depth }) => {
      const result = readDirectoryTree({ path, depth });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "read_markdown_toc",
    "Markdownファイルの見出し一覧（目次）のみを返す。ファイル全体を読む前に必ずこれを使い、必要なセクションを特定すること。",
    {
      path: z.string().describe("Markdownファイルのパス"),
    },
    async ({ path }) => {
      const result = readMarkdownToc({ path });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "read_markdown_section",
    "read_markdown_tocで取得した目次のanchorを指定し、該当セクションのテキストのみを返す。必要なセクションだけを選んで取得すること。",
    {
      path: z.string().describe("Markdownファイルのパス"),
      anchors: z.array(z.string()).describe("取得するセクションのanchorリスト"),
    },
    async ({ path, anchors }) => {
      const result = readMarkdownSection({ path, anchors });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "read_code_skeleton",
    "コードファイルの関数・クラス・メソッドの一覧をシグネチャのみで返す。コードを読む前に必ずこれを使い、必要な関数を特定すること。",
    {
      path: z.string().describe("コードファイルのパス"),
      include_blocks: z.boolean().optional().describe("trueでif/for等のブロックも含む（デフォルト: false）"),
    },
    async ({ path, include_blocks }) => {
      const result = readCodeSkeleton({ path, include_blocks });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "read_code_body",
    "read_code_skeletonで取得したIDを指定し、該当関数・ブロックの本文のみを返す。必要な関数だけを選んで取得すること。",
    {
      path: z.string().describe("コードファイルのパス"),
      ids: z.array(z.string()).describe("取得するブロックのIDリスト"),
    },
    async ({ path, ids }) => {
      const result = readCodeBody({ path, ids });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "search_file",
    "ファイル内のキーワードにマッチした行と前後の文脈のみを返す。特定の処理を探すときに使用すること。",
    {
      path: z.string().describe("検索対象ファイルのパス"),
      query: z.string().describe("検索クエリ（正規表現可）"),
      context_lines: z.number().int().min(0).max(10).optional().describe("マッチ行の前後に含める行数（デフォルト: 2）"),
    },
    async ({ path, query, context_lines }) => {
      const result = searchFile({ path, query, context_lines });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "read_git_diff",
    "圧縮済みのgit diffを返す。変更内容の確認に使用すること。",
    {
      path: z.string().optional().describe("対象パス（省略時はroot全体）"),
      from: z.string().optional().describe("比較元コミット・ブランチ"),
      to: z.string().optional().describe("比較先コミット・ブランチ"),
      compress: z.boolean().optional().describe("trueでcompress_textを追加適用"),
    },
    async ({ path, from, to, compress }) => {
      const result = readGitDiff({ path, from, to, compress });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "read_json_yaml_keys",
    "JSON/YAMLファイルのキー構造一覧のみを返す。ファイル全体を読む前に必ずこれを使い、必要なキーを特定すること。",
    {
      path: z.string().describe("JSON/YAMLファイルのパス"),
      depth: z.number().int().min(1).max(10).optional().describe("取得するキーの深さ（デフォルト: 3）"),
    },
    async ({ path, depth }) => {
      const result = readJsonYamlKeys({ path, depth });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "read_json_yaml_value",
    "read_json_yaml_keysで特定したキーパスの値のみを返す。必要な値だけを選んで取得すること。",
    {
      path: z.string().describe("JSON/YAMLファイルのパス"),
      key_paths: z.array(z.string()).describe("取得するキーパスのリスト（例: 'dependencies.react'）"),
    },
    async ({ path, key_paths }) => {
      const result = readJsonYamlValue({ path, key_paths });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );
}
