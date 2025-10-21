import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return json({ error: 'SQL запрос обязателен' }, { status: 400 });
    }
    
    // Базовая защита от опасных операций
    const normalizedQuery = query.toLowerCase().trim();
    
    // Разрешенные операции
    const allowedOperations = ['select', 'show', 'describe', 'explain'];
    const isAllowed = allowedOperations.some(op => normalizedQuery.startsWith(op));
    
    if (!isAllowed) {
      return json({ 
        error: 'Разрешены только SELECT, SHOW, DESCRIBE и EXPLAIN запросы' 
      }, { status: 403 });
    }
    
    // Запрещенные слова/операции
    const forbiddenWords = [
      'drop', 'delete', 'truncate', 'alter', 'create', 'insert', 'update',
      'grant', 'revoke', 'shutdown', 'kill'
    ];
    
    const hasForbiddenWords = forbiddenWords.some(word => 
      normalizedQuery.includes(word)
    );
    
    if (hasForbiddenWords) {
      return json({ 
        error: 'Запрос содержит запрещенные операции' 
      }, { status: 403 });
    }
    
    // Выполняем запрос
    const result = await db.query(query);
    
    return json({
      rows: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map(field => field.name) || []
    });
    
  } catch (error) {
    console.error('Ошибка выполнения SQL запроса:', error);
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return json({ error: errorMessage }, { status: 500 });
  }
};