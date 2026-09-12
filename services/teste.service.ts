import { sql } from '../database/db.js';

export interface PostRow {
  id: string;
  title: string;
  created_at: string;
}

export async function listPosts(): Promise<PostRow[]> {
  const rows = (await sql`SELECT id, title, created_at FROM posts ORDER BY created_at DESC`) as unknown as PostRow[];
  return rows;
}

export async function createPost(inputTitle: unknown): Promise<PostRow> {
  const title =
    typeof inputTitle === 'string' && inputTitle.trim() ? inputTitle.trim() : 'Post de teste';

  const inserted = (await sql`
    INSERT INTO posts (title)
    VALUES (${title})
    RETURNING id, title, created_at
  `) as unknown as PostRow[];

  const post = inserted[0];
  if (!post) {
    throw new Error('Falha ao criar post.');
  }
  return post;
}
