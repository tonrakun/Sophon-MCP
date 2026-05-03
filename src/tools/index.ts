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
import { memorySave } from "./memory/memory_save.js";
import { memoryGet } from "./memory/memory_get.js";
import { memoryList } from "./memory/memory_list.js";
import { memoryDelete } from "./memory/memory_delete.js";
import { taskCreate } from "./task/task_create.js";
import { taskUpdate } from "./task/task_update.js";
import { taskGet } from "./task/task_get.js";
import { taskList } from "./task/task_list.js";
import { taskDelete } from "./task/task_delete.js";
import { compressText } from "./compress/compress_text.js";
import { fetchWebpage } from "./web/fetch_webpage.js";
import { countTokensTool } from "./context/count_tokens.js";
import { summarizeConversation } from "./context/summarize_conversation.js";

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

export function registerMemoryTools(server: McpServer): void {
  server.tool(
    "memory_save",
    "キーと値のペアをDBに永続化する。セッションをまたいで保持したい情報の保存に使用すること。",
    {
      key: z.string().describe("メモリのキー（一意）"),
      value: z.string().describe("保存する値"),
      tags: z.array(z.string()).optional().describe("タグリスト（検索用）"),
    },
    async ({ key, value, tags }) => {
      const result = memorySave({ key, value, tags });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "memory_get",
    "キーを指定してメモリを1件取得する。",
    {
      key: z.string().describe("取得するメモリのキー"),
    },
    async ({ key }) => {
      const result = memoryGet({ key });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "memory_list",
    "保存済みメモリの一覧を返す。タグやキーワードで絞り込み可能。",
    {
      tag: z.string().optional().describe("絞り込むタグ"),
      search: z.string().optional().describe("キーまたは値に含まれるキーワード"),
    },
    async ({ tag, search }) => {
      const result = memoryList({ tag, search });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "memory_delete",
    "キーを指定してメモリを削除する。",
    {
      key: z.string().describe("削除するメモリのキー"),
    },
    async ({ key }) => {
      const result = memoryDelete({ key });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );
}

export function registerTaskTools(server: McpServer): void {
  server.tool(
    "task_create",
    "新しいタスクを作成する。",
    {
      title: z.string().describe("タスクのタイトル"),
      description: z.string().optional().describe("詳細説明"),
      priority: z.number().int().optional().describe("優先度（高いほど優先、デフォルト: 0）"),
      due_date: z.string().optional().describe("期限（ISO 8601形式）"),
      tags: z.array(z.string()).optional().describe("タグリスト"),
    },
    async ({ title, description, priority, due_date, tags }) => {
      const result = taskCreate({ title, description, priority, due_date, tags });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "task_update",
    "タスクを更新する。指定したフィールドのみ変更される。",
    {
      id: z.number().int().describe("更新するタスクのID"),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["pending", "in_progress", "done", "cancelled"]).optional(),
      priority: z.number().int().optional(),
      due_date: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
    },
    async ({ id, title, description, status, priority, due_date, tags }) => {
      const result = taskUpdate({ id, title, description, status, priority, due_date, tags });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "task_get",
    "IDを指定してタスクを1件取得する。",
    {
      id: z.number().int().describe("取得するタスクのID"),
    },
    async ({ id }) => {
      const result = taskGet({ id });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "task_list",
    "タスク一覧を返す。ステータスやタグで絞り込み可能。",
    {
      status: z.enum(["pending", "in_progress", "done", "cancelled"]).optional().describe("絞り込むステータス"),
      tag: z.string().optional().describe("絞り込むタグ"),
    },
    async ({ status, tag }) => {
      const result = taskList({ status, tag });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "task_delete",
    "IDを指定してタスクを削除する。",
    {
      id: z.number().int().describe("削除するタスクのID"),
    },
    async ({ id }) => {
      const result = taskDelete({ id });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );
}

export function registerCompressTools(server: McpServer): void {
  server.tool(
    "compress_text",
    "テキストを圧縮してトークン数を削減する。大きなテキストをコンテキストに渡す前に使用すること。",
    {
      text: z.string().describe("圧縮するテキスト"),
      max_tokens: z.number().int().optional().describe("最大トークン数（デフォルト: 2000）"),
    },
    async ({ text, max_tokens }) => {
      const result = compressText({ text, max_tokens });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );
}

export function registerWebTools(server: McpServer): void {
  server.tool(
    "fetch_webpage",
    "URLのWebページを取得してテキストとして返す。外部ドキュメントや参考資料の取得に使用すること。",
    {
      url: z.string().url().describe("取得するURL"),
      max_tokens: z.number().int().optional().describe("最大トークン数（デフォルト: 4000）"),
    },
    async ({ url, max_tokens }) => {
      const result = await fetchWebpage({ url, max_tokens });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );
}

export function registerContextTools(server: McpServer): void {
  server.tool(
    "count_tokens",
    "テキストのトークン数を返す（近似値）。コンテキスト使用量の見積もりに使用すること。",
    {
      text: z.string().describe("トークン数を計測するテキスト"),
    },
    async ({ text }) => {
      const result = countTokensTool({ text });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );

  server.tool(
    "summarize_conversation",
    "会話履歴を圧縮して要約する。古いメッセージをサマリに変換し、最新N件を保持する。",
    {
      messages: z.array(
        z.object({
          role: z.enum(["user", "assistant", "system"]),
          content: z.string(),
        })
      ).describe("会話メッセージのリスト"),
      keep_last: z.number().int().optional().describe("末尾から保持するメッセージ数（デフォルト: 4）"),
    },
    async ({ messages, keep_last }) => {
      const result = summarizeConversation({ messages, keep_last });
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
  );
}
